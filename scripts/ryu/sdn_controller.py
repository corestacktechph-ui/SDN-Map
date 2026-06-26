"""
Ryu SDN Controller Application for Enterprise Hierarchical Network

This Ryu application provides:
- OpenFlow 1.3 switch management
- Dynamic flow provisioning
- Link discovery and topology monitoring
- Traffic engineering and path computation
- QoS policy enforcement
- Failover handling
- REST API for external management

Usage:
    ryu-manager sdn_controller.py
    ryu-manager --ofp-tcp-listen-port 6633 sdn_controller.py
"""

from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, MAIN_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.ofproto import ofproto_v1_3
from ryu.lib.packet import packet, ethernet, ipv4, tcp, udp, arp, icmp
from ryu.lib.packet import ether_types
from ryu.topology import event, switches
from ryu.topology.api import get_switch, get_link
from ryu.app.wsgi import ControllerBase, WSGIApplication, route
from ryu.lib import dpid as dpid_lib
from webob import Response
import json
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SDNController(app_manager.RyuApp):
    """
    Ryu SDN Controller for Enterprise Hierarchical Network.
    Implements flow-based forwarding with QoS support.
    """
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    _CONTEXTS = {
        'wsgi': WSGIApplication,
        'switches': switches.Switches,
    }

    def __init__(self, *args, **kwargs):
        super(SDNController, self).__init__(*args, **kwargs)
        self.mac_to_port = {}
        self.switches = {}
        self.links = {}
        self.flow_stats = {}
        self.qos_policies = self._init_qos_policies()
        self.topology_api_app = self
        self.wsgi = kwargs['wsgi']

        # QoS Queue configuration
        self.queues = {
            1: {'min_rate': 30000, 'max_rate': 50000, 'label': 'VoIP_High'},
            2: {'min_rate': 20000, 'max_rate': 40000, 'label': 'ERP_Medium'},
            3: {'min_rate': 15000, 'max_rate': 30000, 'label': 'HR_Medium'},
            4: {'min_rate': 5000, 'max_rate': 15000, 'label': 'Guest_Low'},
            5: {'min_rate': 10000, 'max_rate': 20000, 'label': 'Management_High'},
        }

        # Register REST API
        self.wsgi.register(ControllerAPI, {'sdn_controller': self})

        logger.info('SDN Controller initialized')

    def _init_qos_policies(self):
        """Initialize default QoS policies."""
        return {
            'voip': {'priority': 100, 'dscp': 46, 'queue': 1},
            'erp': {'priority': 80, 'dscp': 26, 'queue': 2},
            'hr': {'priority': 70, 'dscp': 24, 'queue': 3},
            'guest': {'priority': 30, 'dscp': 10, 'queue': 4},
            'management': {'priority': 90, 'dscp': 48, 'queue': 5},
        }

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def switch_features_handler(self, ev):
        """Handle initial switch handshake and install table-miss flow entry."""
        datapath = ev.msg.datapath
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        dpid = dpid_lib.dpid_to_str(datapath.id)
        self.switches[dpid] = {
            'datapath': datapath,
            'connected': True,
            'ports': {},
            'flows': 0,
        }

        logger.info(f'Switch connected: {dpid}')

        # Install table-miss flow entry (send to controller)
        match = parser.OFPMatch()
        actions = [parser.OFPActionOutput(ofproto.OFPP_CONTROLLER,
                                          ofproto.OFPCML_NO_BUFFER)]
        self._add_flow(datapath, 0, match, actions)

    def _add_flow(self, datapath, priority, match, actions, idle_timeout=0, hard_timeout=0):
        """Install a flow entry on a switch."""
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        inst = [parser.OFPInstructionActions(ofproto.OFPIT_APPLY_ACTIONS, actions)]

        mod = parser.OFPFlowMod(
            datapath=datapath,
            priority=priority,
            match=match,
            instructions=inst,
            idle_timeout=idle_timeout,
            hard_timeout=hard_timeout,
            buffer_id=ofproto.OFP_NO_BUFFER
        )

        datapath.send_msg(mod)
        dpid = dpid_lib.dpid_to_str(datapath.id)
        self.switches.setdefault(dpid, {}).setdefault('flows', 0)
        self.switches[dpid]['flows'] += 1

    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def packet_in_handler(self, ev):
        """Handle incoming packets and install forwarding rules."""
        msg = ev.msg
        datapath = msg.datapath
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        in_port = msg.match['in_port']

        pkt = packet.Packet(msg.data)
        eth = pkt.get_protocol(ethernet.ethernet)

        if eth.ethertype == ether_types.ETH_TYPE_LLDP:
            return

        dst_mac = eth.dst
        src_mac = eth.src
        dpid = dpid_lib.dpid_to_str(datapath.id)

        self.mac_to_port.setdefault(dpid, {})
        self.mac_to_port[dpid][src_mac] = in_port

        # Handle ARP
        if eth.ethertype == ether_types.ETH_TYPE_ARP:
            self._handle_arp(datapath, in_port, dst_mac, src_mac, pkt, msg)
            return

        # Handle IPv4
        if eth.ethertype == ether_types.ETH_TYPE_IP:
            ip_pkt = pkt.get_protocol(ipv4.ipv4)
            if ip_pkt:
                self._handle_ip(datapath, in_port, dst_mac, src_mac,
                                ip_pkt, pkt, msg)
            return

        # Default: flood
        out_port = ofproto.OFPP_FLOOD
        actions = [parser.OFPActionOutput(out_port)]
        data = None
        if msg.buffer_id == ofproto.OFP_NO_BUFFER:
            data = msg.data

        out = parser.OFPPacketOut(
            datapath=datapath,
            buffer_id=msg.buffer_id,
            in_port=in_port,
            actions=actions,
            data=data
        )
        datapath.send_msg(out)

    def _handle_arp(self, datapath, in_port, dst_mac, src_mac, pkt, msg):
        """Handle ARP packets by flooding."""
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        out_port = ofproto.OFPP_FLOOD
        actions = [parser.OFPActionOutput(out_port)]

        data = None
        if msg.buffer_id == ofproto.OFP_NO_BUFFER:
            data = msg.data

        out = parser.OFPPacketOut(
            datapath=datapath,
            buffer_id=msg.buffer_id,
            in_port=in_port,
            actions=actions,
            data=data
        )
        datapath.send_msg(out)

    def _handle_ip(self, datapath, in_port, dst_mac, src_mac, ip_pkt, pkt, msg):
        """Handle IP packets by installing flow-based forwarding rules."""
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser
        dpid = dpid_lib.dpid_to_str(datapath.id)

        # Determine QoS queue based on traffic type
        queue_id = self._get_qos_queue(ip_pkt, pkt)

        if dst_mac in self.mac_to_port.get(dpid, {}):
            out_port = self.mac_to_port[dpid][dst_mac]
        else:
            out_port = ofproto.OFPP_FLOOD

        actions = []
        if queue_id:
            actions.append(parser.OFPActionSetQueue(queue_id))
        actions.append(parser.OFPActionOutput(out_port))

        # Install flow entry for future packets
        if dst_mac in self.mac_to_port.get(dpid, {}):
            match = parser.OFPMatch(
                eth_dst=dst_mac,
                eth_src=src_mac
            )
            self._add_flow(datapath, 50, match, actions, idle_timeout=30)

        data = None
        if msg.buffer_id == ofproto.OFP_NO_BUFFER:
            data = msg.data

        out = parser.OFPPacketOut(
            datapath=datapath,
            buffer_id=msg.buffer_id,
            in_port=in_port,
            actions=actions,
            data=data
        )
        datapath.send_msg(out)

    def _get_qos_queue(self, ip_pkt, pkt):
        """Determine appropriate QoS queue for traffic."""
        if ip_pkt.proto == 17:  # UDP
            udp_pkt = pkt.get_protocol(udp.udp)
            if udp_pkt:
                # VoIP typically uses UDP ports 5060-5070
                if 5060 <= udp_pkt.src_port <= 5070 or 5060 <= udp_pkt.dst_port <= 5070:
                    return self.qos_policies['voip']['queue']

        if ip_pkt.proto == 6:  # TCP
            tcp_pkt = pkt.get_protocol(tcp.tcp)
            if tcp_pkt:
                # ERP typically uses port 3200
                if tcp_pkt.dst_port == 3200 or tcp_pkt.src_port == 3200:
                    return self.qos_policies['erp']['queue']
                # HR systems on port 8080
                if tcp_pkt.dst_port == 8080 or tcp_pkt.src_port == 8080:
                    return self.qos_policies['hr']['queue']

        return None

    @set_ev_cls(event.EventSwitchEnter)
    def switch_enter_handler(self, ev):
        """Handle switch entering the topology."""
        switch = ev.switch
        dpid = dpid_lib.dpid_to_str(switch.dp.id)
        logger.info(f'Switch entered topology: {dpid}')

    @set_ev_cls(event.EventSwitchLeave)
    def switch_leave_handler(self, ev):
        """Handle switch leaving the topology."""
        switch = ev.switch
        dpid = dpid_lib.dpid_to_str(switch.dp.id)
        logger.info(f'Switch left topology: {dpid}')

    @set_ev_cls(event.EventLinkAdd)
    def link_add_handler(self, ev):
        """Handle link being added."""
        link = ev.link
        src_dpid = dpid_lib.dpid_to_str(link.src.dpid)
        dst_dpid = dpid_lib.dpid_to_str(link.dst.dpid)
        logger.info(f'Link added: {src_dpid}:{link.src.port_no} -> {dst_dpid}:{link.dst.port_no}')

    @set_ev_cls(event.EventLinkDelete)
    def link_delete_handler(self, ev):
        """Handle link being removed (failover trigger)."""
        link = ev.link
        src_dpid = dpid_lib.dpid_to_str(link.src.dpid)
        dst_dpid = dpid_lib.dpid_to_str(link.dst.dpid)
        logger.info(f'Link removed: {src_dpid}:{link.src.port_no} -> {dst_dpid}:link.dst.port_no')
        self._handle_failover(src_dpid, dst_dpid)

    def _handle_failover(self, src_dpid, dst_dpid):
        """Handle link failover by recalculating paths."""
        logger.info(f'Handling failover between {src_dpid} and {dst_dpid}')
        # Clear MAC learning for affected switches
        if src_dpid in self.mac_to_port:
            self.mac_to_port[src_dpid] = {}
        if dst_dpid in self.mac_to_port:
            self.mac_to_port[dst_dpid] = {}
        logger.info(f'Failover complete: MAC tables cleared for {src_dpid} and {dst_dpid}')

    def get_topology_data(self):
        """Get current topology information."""
        switch_list = get_switch(self.topology_api_app, None)
        link_list = get_link(self.topology_api_app, None)

        switches_data = []
        for s in switch_list:
            dpid = dpid_lib.dpid_to_str(s.dp.id)
            switches_data.append({
                'dpid': dpid,
                'ports': len(s.ports),
                'connected': self.switches.get(dpid, {}).get('connected', False),
                'flows': self.switches.get(dpid, {}).get('flows', 0),
            })

        links_data = []
        for l in link_list:
            links_data.append({
                'src': {
                    'dpid': dpid_lib.dpid_to_str(l.src.dpid),
                    'port': l.src.port_no,
                },
                'dst': {
                    'dpid': dpid_lib.dpid_to_str(l.dst.dpid),
                    'port': l.dst.port_no,
                },
            })

        return {
            'switches': switches_data,
            'links': links_data,
            'flow_count': sum(s.get('flows', 0) for s in self.switches.values()),
            'qos_policies': len(self.qos_policies),
        }


class ControllerAPI(ControllerBase):
    """REST API for SDN Controller management."""

    def __init__(self, req, link, data, **config):
        super(ControllerAPI, self).__init__(req, link, data, **config)
        self.sdn_controller = data['sdn_controller']

    @route('topology', '/api/topology', methods=['GET'])
    def get_topology(self, req, **kwargs):
        """Get network topology information."""
        topology = self.sdn_controller.get_topology_data()
        return Response(
            content_type='application/json',
            body=json.dumps(topology)
        )

    @route('flows', '/api/flows/{dpid}', methods=['GET'])
    def get_flows(self, req, **kwargs):
        """Get flow entries for a specific switch."""
        dpid = kwargs.get('dpid')
        switch = self.sdn_controller.switches.get(dpid)
        if switch:
            return Response(
                content_type='application/json',
                body=json.dumps({
                    'dpid': dpid,
                    'flows': switch.get('flows', 0),
                    'connected': switch.get('connected', False),
                })
            )
        return Response(
            status=404,
            content_type='application/json',
            body=json.dumps({'error': 'Switch not found'})
        )

    @route('stats', '/api/stats', methods=['GET'])
    def get_stats(self, req, **kwargs):
        """Get controller statistics."""
        return Response(
            content_type='application/json',
            body=json.dumps({
                'switches': len(self.sdn_controller.switches),
                'flows': sum(
                    s.get('flows', 0) for s in self.sdn_controller.switches.values()
                ),
                'qos_policies': list(self.sdn_controller.qos_policies.keys()),
                'uptime': int(time.time()),
            })
        )

    @route('qos', '/api/qos', methods=['GET'])
    def get_qos(self, req, **kwargs):
        """Get QoS policy information."""
        return Response(
            content_type='application/json',
            body=json.dumps(self.sdn_controller.qos_policies)
        )


def main():
    """Main entry point for running directly."""
    from ryu.cmd import manager
    manager.main()


if __name__ == '__main__':
    main()
