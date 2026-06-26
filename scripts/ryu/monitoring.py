"""
Ryu Network Monitoring Application

This application provides:
- Real-time traffic monitoring
- Flow statistics collection
- Link utilization tracking
- Performance metrics collection
- Event logging for analysis

Usage:
    ryu-manager monitoring.py
"""

from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, MAIN_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.ofproto import ofproto_v1_3
from ryu.lib import dpid as dpid_lib
from ryu.app.wsgi import ControllerBase, WSGIApplication, route
from webob import Response
import json
import time
import threading
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NetworkMonitor(app_manager.RyuApp):
    """
    Ryu Network Monitoring Application.
    Collects flow statistics and link utilization data.
    """
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    _CONTEXTS = {'wsgi': WSGIApplication}

    def __init__(self, *args, **kwargs):
        super(NetworkMonitor, self).__init__(*args, **kwargs)
        self.wsgi = kwargs['wsgi']
        self.datapaths = {}
        self.monitor_thread = None
        self.stats_data = {
            'flows': [],
            'ports': {},
            'timestamp': 0,
        }

        self.wsgi.register(MonitorAPI, {'monitor': self})
        self._start_monitor()
        logger.info('Network Monitor initialized')

    def _start_monitor(self):
        """Start periodic monitoring thread."""
        def monitor_loop():
            while True:
                self._request_stats()
                time.sleep(5)

        self.monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        self.monitor_thread.start()

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def switch_features_handler(self, ev):
        """Store datapath information."""
        datapath = ev.msg.datapath
        self.datapaths[datapath.id] = datapath

    def _request_stats(self):
        """Request flow and port statistics from all switches."""
        for dpid, datapath in self.datapaths.items():
            self._request_flow_stats(datapath)
            self._request_port_stats(datapath)

    def _request_flow_stats(self, datapath):
        """Request flow statistics from a switch."""
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        req = parser.OFPFlowStatsRequest(datapath)
        datapath.send_msg(req)

    def _request_port_stats(self, datapath):
        """Request port statistics from a switch."""
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        req = parser.OFPPortStatsRequest(datapath, 0, ofproto.OFPP_ANY)
        datapath.send_msg(req)

    @set_ev_cls(ofp_event.EventOFPFlowStatsReply, MAIN_DISPATCHER)
    def flow_stats_reply_handler(self, ev):
        """Handle flow statistics reply."""
        msg = ev.msg
        dpid = dpid_lib.dpid_to_str(msg.datapath.id)

        flows = []
        for stat in msg.body:
            flows.append({
                'dpid': dpid,
                'priority': stat.priority,
                'idle_timeout': stat.idle_timeout,
                'hard_timeout': stat.hard_timeout,
                'match': str(stat.match),
                'instructions': str(stat.instructions),
                'byte_count': stat.byte_count,
                'packet_count': stat.packet_count,
                'duration_sec': stat.duration_sec,
                'duration_nsec': stat.duration_nsec,
            })

        self.stats_data['flows'] = flows
        self.stats_data['timestamp'] = time.time()

    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def port_stats_reply_handler(self, ev):
        """Handle port statistics reply."""
        msg = ev.msg
        dpid = dpid_lib.dpid_to_str(msg.datapath.id)

        ports = {}
        for stat in msg.body:
            ports[stat.port_no] = {
                'rx_packets': stat.rx_packets,
                'tx_packets': stat.tx_packets,
                'rx_bytes': stat.rx_bytes,
                'tx_bytes': stat.tx_bytes,
                'rx_errors': stat.rx_errors,
                'tx_errors': stat.tx_errors,
                'rx_dropped': stat.rx_dropped,
                'tx_dropped': stat.tx_dropped,
            }

        self.stats_data['ports'][dpid] = ports
        self.stats_data['timestamp'] = time.time()

    def get_monitoring_data(self):
        """Get current monitoring statistics."""
        total_bytes = 0
        total_packets = 0
        total_flows = len(self.stats_data['flows'])

        for dpid, ports in self.stats_data['ports'].items():
            for port_no, stats in ports.items():
                total_bytes += stats['rx_bytes'] + stats['tx_bytes']
                total_packets += stats['rx_packets'] + stats['tx_packets']

        return {
            'total_flows': total_flows,
            'total_bytes': total_bytes,
            'total_packets': total_packets,
            'active_switches': len(self.stats_data['ports']),
            'timestamp': self.stats_data['timestamp'],
            'flows': self.stats_data['flows'][:50],
        }


class MonitorAPI(ControllerBase):
    """REST API for monitoring data."""

    def __init__(self, req, link, data, **config):
        super(MonitorAPI, self).__init__(req, link, data, **config)
        self.monitor = data['monitor']

    @route('monitor', '/api/monitor', methods=['GET'])
    def get_monitor_data(self, req, **kwargs):
        return Response(
            content_type='application/json',
            body=json.dumps(self.monitor.get_monitoring_data())
        )


if __name__ == '__main__':
    from ryu.cmd import manager
    manager.main()
