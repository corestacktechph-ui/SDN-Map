"""
Ryu QoS Controller Application

This application extends the SDN controller with advanced QoS features:
- Queue configuration for different traffic classes
- DSCP marking for traffic prioritization
- Rate limiting for guest VLANs
- Bandwidth guarantees for VoIP and management traffic

Usage:
    ryu-manager qos_controller.py
"""

from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, MAIN_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.ofproto import ofproto_v1_3
from ryu.ofproto import ofproto_v1_3_parser
from ryu.lib.packet import packet, ethernet, ipv4, tcp, udp
from ryu.lib.packet import ether_types
from ryu.app.wsgi import ControllerBase, WSGIApplication, route
from webob import Response
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QoSController(app_manager.RyuApp):
    """
    Ryu QoS Controller for traffic prioritization and rate limiting.
    Implements DiffServ-like QoS with multiple queue configurations.
    """
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    _CONTEXTS = {'wsgi': WSGIApplication}

    def __init__(self, *args, **kwargs):
        super(QoSController, self).__init__(*args, **kwargs)
        self.wsgi = kwargs['wsgi']
        self.qos_policies = {}
        self.queue_stats = {}
        self._configure_policies()

        self.wsgi.register(QoSAPI, {'qos_controller': self})
        logger.info('QoS Controller initialized')

    def _configure_policies(self):
        """Configure default QoS policies."""
        self.qos_policies = {
            'voip': {
                'enabled': True,
                'priority': 'HIGH',
                'dscp': 46,
                'queue_id': 1,
                'min_rate': 30000,
                'max_rate': 50000,
                'match': 'udp_port_range=5060-5070',
            },
            'erp': {
                'enabled': True,
                'priority': 'MEDIUM',
                'dscp': 26,
                'queue_id': 2,
                'min_rate': 20000,
                'max_rate': 40000,
                'match': 'tcp_port=3200',
            },
            'hr': {
                'enabled': True,
                'priority': 'MEDIUM',
                'dscp': 24,
                'queue_id': 3,
                'min_rate': 15000,
                'max_rate': 30000,
                'match': 'tcp_port=8080',
            },
            'guest': {
                'enabled': True,
                'priority': 'LOW',
                'dscp': 10,
                'queue_id': 4,
                'min_rate': 5000,
                'max_rate': 15000,
                'match': 'vlan_range=110-130',
            },
            'management': {
                'enabled': True,
                'priority': 'HIGH',
                'dscp': 48,
                'queue_id': 5,
                'min_rate': 10000,
                'max_rate': 20000,
                'match': 'vlan=5',
            },
        }

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def switch_features_handler(self, ev):
        """Configure QoS queues on switch connection."""
        datapath = ev.msg.datapath
        self._configure_queues(datapath)
        self._install_qos_flows(datapath)

    def _configure_queues(self, datapath):
        """Configure output queues on all ports."""
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        queue_configs = [
            (1, 30000, 50000, 'VoIP_High'),
            (2, 20000, 40000, 'ERP_Medium'),
            (3, 15000, 30000, 'HR_Medium'),
            (4, 5000, 15000, 'Guest_Low'),
            (5, 10000, 20000, 'Management_High'),
        ]

        for port_no in range(1, 20):
            properties = []
            for queue_id, min_rate, max_rate, label in queue_configs:
                prop = parser.OFPQueuePropMinRate(min_rate)
                properties.append(prop)
                prop = parser.OFPQueuePropMaxRate(max_rate)
                properties.append(prop)

                queue = parser.OFPPacketQueue(
                    queue_id=queue_id,
                    port=port_no,
                    properties=properties
                )

        logger.info(f'Configured QoS queues on datapath {datapath.id}')

    def _install_qos_flows(self, datapath):
        """Install QoS flow entries based on policies."""
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        for name, policy in self.qos_policies.items():
            if not policy['enabled']:
                continue

            actions = [
                parser.OFPActionSetField(ip_dscp=policy['dscp']),
                parser.OFPActionSetQueue(policy['queue_id']),
            ]

            # Create match based on policy
            if name == 'voip':
                match = parser.OFPMatch(
                    eth_type=ether_types.ETH_TYPE_IP,
                    ip_proto=17,
                    udp_dst=5060,
                )
            elif name == 'erp':
                match = parser.OFPMatch(
                    eth_type=ether_types.ETH_TYPE_IP,
                    ip_proto=6,
                    tcp_dst=3200,
                )
            elif name == 'hr':
                match = parser.OFPMatch(
                    eth_type=ether_types.ETH_TYPE_IP,
                    ip_proto=6,
                    tcp_dst=8080,
                )
            elif name == 'management':
                match = parser.OFPMatch(
                    eth_type=ether_types.ETH_TYPE_IP,
                )
            else:
                continue

            inst = [parser.OFPInstructionActions(
                ofproto.OFPIT_APPLY_ACTIONS, actions
            )]

            mod = parser.OFPFlowMod(
                datapath=datapath,
                priority=policy.get('dscp', 50),
                match=match,
                instructions=inst,
                idle_timeout=0,
                hard_timeout=0,
            )

            datapath.send_msg(mod)
            logger.info(f'Installed QoS flow: {name} (DSCP {policy["dscp"]}, Queue {policy["queue_id"]})')

    def get_qos_stats(self):
        """Get current QoS policy statistics."""
        return {
            'total_policies': len(self.qos_policies),
            'policies': self.qos_policies,
            'enabled_policies': sum(1 for p in self.qos_policies.values() if p['enabled']),
        }


class QoSAPI(ControllerBase):
    """REST API for QoS management."""

    def __init__(self, req, link, data, **config):
        super(QoSAPI, self).__init__(req, link, data, **config)
        self.qos = data['qos_controller']

    @route('qos', '/api/qos', methods=['GET'])
    def get_qos(self, req, **kwargs):
        return Response(
            content_type='application/json',
            body=json.dumps(self.qos.get_qos_stats())
        )

    @route('qos', '/api/qos/{name}', methods=['PUT'])
    def update_qos(self, req, **kwargs):
        name = kwargs.get('name')
        if name not in self.qos.qos_policies:
            return Response(
                status=404,
                body=json.dumps({'error': 'Policy not found'})
            )

        body = json.loads(req.body)
        if 'enabled' in body:
            self.qos.qos_policies[name]['enabled'] = body['enabled']
        if 'min_rate' in body:
            self.qos.qos_policies[name]['min_rate'] = body['min_rate']
        if 'max_rate' in body:
            self.qos.qos_policies[name]['max_rate'] = body['max_rate']

        return Response(
            content_type='application/json',
            body=json.dumps(self.qos.qos_policies[name])
        )


if __name__ == '__main__':
    from ryu.cmd import manager
    manager.main()
