"""
Helper module for posting Mininet simulation results to the web dashboard API.

Usage from any Mininet test script:
    from post_results import post_results

    results = [
        {"metric": "Average Latency", "value": 18.3, "unit": "ms", "min": 8.4, "max": 32.6, "stdDev": 5.2, "sampleSize": 27},
        {"metric": "Packet Loss", "value": 0.82, "unit": "%"},
    ]
    post_results(
        test_type="ping",
        architecture="TRADITIONAL",
        results=results,
        script_name="failover_testing.py",
        raw_output="optional terminal output"
    )
"""

import json
import os
import sys

try:
    from urllib.request import Request, urlopen
    from urllib.error import URLError, HTTPError
except ImportError:
    from urllib2 import Request, urlopen, URLError, HTTPError

# Default API URL — set to your Vercel production URL
# Override by setting SDN_API_URL environment variable
API_URL = os.environ.get("SDN_API_URL", "https://sdn-map.vercel.app")


def post_results(test_type, architecture, results, script_name=None, raw_output=None, duration=None, api_url=None):
    """
    Post simulation results to the dashboard API.

    Args:
        test_type: str - "ping", "throughput", "jitter", "failover", "qos", "vlan", "scalability"
        architecture: str - "TRADITIONAL" or "SDN"
        results: list of dicts - [{"metric": str, "value": float, "unit": str, ...}]
        script_name: str - name of the script that generated these results
        raw_output: str - optional raw terminal output
        duration: int - test duration in seconds
        api_url: str - override the API base URL
    
    Returns:
        dict with response data or None if failed
    """
    url = (api_url or API_URL).rstrip("/") + "/api/simulation-results"

    payload = {
        "testType": test_type,
        "architecture": architecture.upper(),
        "results": results,
        "scriptName": script_name or "unknown",
        "rawOutput": raw_output,
        "duration": duration,
    }

    data = json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, headers={"Content-Type": "application/json"})

    try:
        response = urlopen(req, timeout=10)
        response_data = json.loads(response.read().decode("utf-8"))
        print(f"\n✓ Results posted to dashboard: {len(results)} metrics ({architecture} / {test_type})")
        print(f"  Test ID: {response_data.get('testId', 'N/A')}")
        return response_data
    except HTTPError as e:
        error_body = e.read().decode("utf-8") if hasattr(e, 'read') else str(e)
        print(f"\n✗ Failed to post results: HTTP {e.code}")
        print(f"  Error: {error_body}")
        return None
    except URLError as e:
        print(f"\n✗ Cannot connect to dashboard API at {url}")
        print(f"  Error: {e.reason}")
        print(f"  Make sure the web app is running (npm run dev) or set SDN_API_URL env var")
        return None
    except Exception as e:
        print(f"\n✗ Unexpected error posting results: {e}")
        return None


def post_comparison(test_type, trad_results, sdn_results, script_name=None, raw_output=None, api_url=None):
    """
    Convenience function: post both Traditional and SDN results in one call.
    The API will automatically create a ComparisonResult.
    
    Args:
        test_type: str
        trad_results: list of metric dicts for Traditional
        sdn_results: list of metric dicts for SDN
        script_name: str
        raw_output: str
        api_url: str
    """
    print("\n" + "=" * 60)
    print("  POSTING RESULTS TO DASHBOARD")
    print("=" * 60)

    trad_response = post_results(
        test_type=test_type,
        architecture="TRADITIONAL",
        results=trad_results,
        script_name=script_name,
        raw_output=raw_output,
        api_url=api_url,
    )

    sdn_response = post_results(
        test_type=test_type,
        architecture="SDN",
        results=sdn_results,
        script_name=script_name,
        raw_output=raw_output,
        api_url=api_url,
    )

    if trad_response and sdn_response:
        print("\n✓ Both results posted. Comparison auto-generated on dashboard.")
    else:
        print("\n⚠ Some results failed to post. Check the web app is running.")

    return trad_response, sdn_response


if __name__ == "__main__":
    # Quick test — run this standalone to verify connectivity
    print("Testing API connectivity...")
    test_results = [
        {"metric": "Test Metric", "value": 1.0, "unit": "ms", "sampleSize": 1}
    ]
    response = post_results(
        test_type="ping",
        architecture="TRADITIONAL",
        results=test_results,
        script_name="connectivity_test",
    )
    if response:
        print("✓ API is working!")
    else:
        print("✗ API not reachable. Is the web app running?")
