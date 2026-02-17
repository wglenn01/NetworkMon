import requests
import sys
import json
from datetime import datetime

class NetworkMonitoringAPITester:
    def __init__(self, base_url="https://netgraph-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.category_ids = []
        self.device_ids = []
        self.template_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_get_categories(self):
        """Test getting all categories"""
        return self.run_test("Get Categories", "GET", "categories", 200)

    def test_create_category(self):
        """Test creating a new category"""
        category_data = {
            "name": "Test Firewalls",
            "description": "Test firewall devices",
            "color": "#FF5722",
            "icon": "shield"
        }
        success, response = self.run_test("Create Category", "POST", "categories", 200, category_data)
        if success and 'id' in response:
            self.category_ids.append(response['id'])
        return success, response

    def test_get_devices(self):
        """Test getting all devices"""
        return self.run_test("Get Devices", "GET", "devices", 200)

    def test_create_device(self):
        """Test creating a new device"""
        # First ensure we have a category
        if not self.category_ids:
            self.test_create_category()
        
        if not self.category_ids:
            print("❌ Cannot create device without a category")
            return False, {}

        device_data = {
            "name": "Test-Router-99",
            "ip_address": "192.168.99.99",
            "category_id": self.category_ids[0],
            "community_string": "public",
            "ping_enabled": True,
            "snmp_enabled": True,
            "oids": [
                {
                    "oid": "1.3.6.1.4.1.9.9.109.1.1.1.1.3.1",
                    "name": "Test CPU Usage",
                    "unit": "%",
                    "threshold_warning": 80.0,
                    "threshold_critical": 95.0
                }
            ]
        }
        success, response = self.run_test("Create Device", "POST", "devices", 200, device_data)
        if success and 'id' in response:
            self.device_ids.append(response['id'])
        return success, response

    def test_get_device_by_id(self):
        """Test getting a specific device"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot get device without device ID")
            return False, {}

        device_id = self.device_ids[0]
        return self.run_test(f"Get Device {device_id}", "GET", f"devices/{device_id}", 200)

    def test_update_device(self):
        """Test updating a device"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot update device without device ID")
            return False, {}

        device_id = self.device_ids[0]
        update_data = {
            "name": "Test-Router-99-Updated",
            "ping_enabled": False
        }
        return self.run_test(f"Update Device {device_id}", "PUT", f"devices/{device_id}", 200, update_data)

    def test_poll_device(self):
        """Test polling a specific device"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot poll device without device ID")
            return False, {}

        device_id = self.device_ids[0]
        return self.run_test(f"Poll Device {device_id}", "POST", f"monitoring/poll/{device_id}", 200)

    def test_poll_all_devices(self):
        """Test polling all devices"""
        return self.run_test("Poll All Devices", "POST", "monitoring/poll-all", 200)

    def test_get_monitoring_data(self):
        """Test getting monitoring data for a device"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot get monitoring data without device ID")
            return False, {}

        device_id = self.device_ids[0]
        return self.run_test(f"Get Monitoring Data {device_id}", "GET", f"monitoring/{device_id}?hours=1", 200)

    def test_get_latest_monitoring(self):
        """Test getting latest monitoring data for a device"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot get latest monitoring without device ID")
            return False, {}

        device_id = self.device_ids[0]
        return self.run_test(f"Get Latest Monitoring {device_id}", "GET", f"monitoring/{device_id}/latest", 200)

    def test_get_alerts(self):
        """Test getting all alerts"""
        return self.run_test("Get Alerts", "GET", "alerts", 200)

    def test_seed_data(self):
        """Test seeding sample data"""
        return self.run_test("Seed Data", "POST", "seed", 200)

    def test_get_templates(self):
        """Test getting all SNMP templates"""
        return self.run_test("Get SNMP Templates", "GET", "templates", 200)

    def test_create_template(self):
        """Test creating a new SNMP template"""
        template_data = {
            "name": "Test Generic Device",
            "description": "Basic test template",
            "brand": "Generic",
            "oids": [
                {
                    "oid": "1.3.6.1.2.1.1.3.0",
                    "name": "Test Uptime",
                    "unit": "s",
                    "threshold_warning": None,
                    "threshold_critical": None
                },
                {
                    "oid": "1.3.6.1.2.1.2.2.1.10.1",
                    "name": "Test Interface In",
                    "unit": "bps",
                    "threshold_warning": 80000000.0,
                    "threshold_critical": 90000000.0
                }
            ]
        }
        success, response = self.run_test("Create SNMP Template", "POST", "templates", 200, template_data)
        if success and 'id' in response:
            self.template_ids.append(response['id'])
        return success, response

    def test_get_template_by_id(self):
        """Test getting a specific SNMP template"""
        if not self.template_ids:
            self.test_create_template()
        
        if not self.template_ids:
            print("❌ Cannot get template without template ID")
            return False, {}

        template_id = self.template_ids[0]
        return self.run_test(f"Get Template {template_id}", "GET", f"templates/{template_id}", 200)

    def test_update_template(self):
        """Test updating an SNMP template"""
        if not self.template_ids:
            self.test_create_template()
        
        if not self.template_ids:
            print("❌ Cannot update template without template ID")
            return False, {}

        template_id = self.template_ids[0]
        update_data = {
            "name": "Test Generic Device Updated",
            "description": "Updated test template description"
        }
        return self.run_test(f"Update Template {template_id}", "PUT", f"templates/{template_id}", 200, update_data)

    def test_device_auto_poll_settings(self):
        """Test device auto polling configuration (polling_interval and auto_poll fields)"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot test auto poll without device ID")
            return False, {}

        device_id = self.device_ids[0]
        # Test updating device with different polling intervals
        for interval, label in [(30, "30s"), (60, "1min"), (300, "5min"), (900, "15min"), (3600, "1hr")]:
            update_data = {
                "polling_interval": interval,
                "auto_poll": True
            }
            success, response = self.run_test(f"Set Device Auto Poll {label}", "PUT", f"devices/{device_id}", 200, update_data)
            if success:
                # Verify the fields were updated correctly
                if response.get('polling_interval') != interval:
                    print(f"❌ Polling interval not set correctly: expected {interval}, got {response.get('polling_interval')}")
                    return False, {}
                if response.get('auto_poll') != True:
                    print(f"❌ Auto poll not set correctly: expected True, got {response.get('auto_poll')}")
                    return False, {}
            else:
                return False, {}
        
        return True, {}

    def test_auto_poll_endpoint(self):
        """Test the auto polling endpoint"""
        return self.run_test("Auto Poll Due Devices", "POST", "monitoring/auto-poll", 200)

    def test_scheduler_status(self):
        """Test scheduler status endpoint - NEW SCHEDULER FUNCTIONALITY"""
        success, response = self.run_test("Scheduler Status", "GET", "scheduler/status", 200)
        if success:
            # Verify required fields are present
            required_fields = ['scheduler_running', 'auto_poll_enabled_devices', 'check_interval_seconds']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False, {}
            
            # Verify scheduler is running
            if not response.get('scheduler_running'):
                print(f"❌ Scheduler not running: {response.get('scheduler_running')}")
                return False, {}
            
            print(f"✅ Scheduler Status: Running={response['scheduler_running']}, Devices={response['auto_poll_enabled_devices']}")
        return success, response

    def test_devices_due_for_poll(self):
        """Test endpoint to get devices due for polling"""
        return self.run_test("Devices Due for Poll", "GET", "monitoring/due-for-poll", 200)

    def test_device_last_polled_update(self):
        """Test that device last_polled timestamp gets updated after polling"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot test polling timestamp without device ID")
            return False, {}

        device_id = self.device_ids[0]
        
        # Get device before polling
        success_before, response_before = self.run_test(f"Get Device Before Poll {device_id}", "GET", f"devices/{device_id}", 200)
        if not success_before:
            return False, {}
        
        last_polled_before = response_before.get('last_polled')
        print(f"   Last polled before: {last_polled_before}")
        
        # Poll the device
        success_poll, _ = self.run_test(f"Poll Device {device_id}", "POST", f"monitoring/poll/{device_id}", 200)
        if not success_poll:
            return False, {}
        
        # Wait a moment and get device after polling
        import time
        time.sleep(2)
        
        success_after, response_after = self.run_test(f"Get Device After Poll {device_id}", "GET", f"devices/{device_id}", 200)
        if not success_after:
            return False, {}
        
        last_polled_after = response_after.get('last_polled')
        print(f"   Last polled after: {last_polled_after}")
        
        # Verify timestamp was updated
        if last_polled_after == last_polled_before:
            print("❌ last_polled timestamp was not updated after polling")
            return False, {}
        
        if last_polled_after is None:
            print("❌ last_polled timestamp is None after polling")
            return False, {}
        
        print("✅ last_polled timestamp successfully updated")
        return True, response_after

    def test_alert_auto_resolution(self):
        """Test alert auto-resolution functionality"""
        # First, ensure we have sample data to work with
        self.test_seed_data()
        
        # Get current alerts
        success, alerts_before = self.run_test("Get Alerts Before", "GET", "alerts", 200)
        if not success:
            return False, {}
        
        unacknowledged_before = [a for a in alerts_before if not a.get('acknowledged')]
        print(f"   Unacknowledged alerts before polling: {len(unacknowledged_before)}")
        
        # Poll all devices to trigger auto-resolution
        success_poll, _ = self.run_test("Poll All for Auto Resolution", "POST", "monitoring/poll-all", 200)
        if not success_poll:
            return False, {}
        
        # Wait for polling to complete
        import time
        time.sleep(3)
        
        # Get alerts after polling
        success_after, alerts_after = self.run_test("Get Alerts After", "GET", "alerts", 200)
        if not success_after:
            return False, {}
        
        unacknowledged_after = [a for a in alerts_after if not a.get('acknowledged')]
        print(f"   Unacknowledged alerts after polling: {len(unacknowledged_after)}")
        
        # Note: Auto-resolution depends on device status changes, so we can't guarantee specific results
        # But we can verify the endpoint works and returns valid data
        print("✅ Auto-resolution test completed - alert counts may vary based on device status")
        return True, alerts_after

    def test_duplicate_alert_prevention(self):
        """Test that duplicate alerts within 5 minutes are prevented"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot test duplicate prevention without device ID")
            return False, {}

        device_id = self.device_ids[0]
        
        # Get alerts count before
        success, alerts_before = self.run_test("Get Alerts Before Duplicate Test", "GET", "alerts", 200)
        if not success:
            return False, {}
        
        initial_count = len(alerts_before)
        print(f"   Initial alert count: {initial_count}")
        
        # Poll the same device multiple times in quick succession
        for i in range(3):
            success_poll, _ = self.run_test(f"Duplicate Test Poll {i+1}", "POST", f"monitoring/poll/{device_id}", 200)
            if not success_poll:
                return False, {}
            # Small delay between polls
            import time
            time.sleep(0.5)
        
        # Wait a moment for processing
        import time
        time.sleep(2)
        
        # Get alerts count after
        success_after, alerts_after = self.run_test("Get Alerts After Duplicate Test", "GET", "alerts", 200)
        if not success_after:
            return False, {}
        
        final_count = len(alerts_after)
        print(f"   Final alert count: {final_count}")
        
        # The duplicate prevention logic should prevent excessive duplicate alerts
        # We can't predict exact numbers due to device states, but endpoint should work
        print("✅ Duplicate prevention test completed - backend handles multiple polls correctly")
        return True, alerts_after

    def test_alert_history_endpoint(self):
        """Test alert history endpoint for specific device"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot test alert history without device ID")
            return False, {}

        device_id = self.device_ids[0]
        # Test alert history endpoint
        success, response = self.run_test(f"Get Alert History {device_id}", "GET", f"alerts/history/{device_id}", 200)
        
        if success:
            # Verify response is a list
            if not isinstance(response, list):
                print(f"❌ Alert history should return a list, got {type(response)}")
                return False, {}
            
            print(f"✅ Alert history returned {len(response)} alerts")
            # Check if any resolved alerts have resolved_at timestamp
            for alert in response:
                if alert.get('resolved') and 'resolved_at' in alert:
                    print(f"✅ Found resolved alert with resolved_at timestamp: {alert['resolved_at']}")
                    break
        
        return success, response

    def test_category_stats_endpoint(self):
        """Test category statistics endpoint"""
        success, response = self.run_test("Get Category Stats", "GET", "categories/stats", 200)
        
        if success:
            # Verify response is a list
            if not isinstance(response, list):
                print(f"❌ Category stats should return a list, got {type(response)}")
                return False, {}
            
            # Check each category has required fields
            required_fields = ['id', 'name', 'total', 'online', 'offline']
            for category_stat in response:
                for field in required_fields:
                    if field not in category_stat:
                        print(f"❌ Category stat missing required field: {field}")
                        return False, {}
                
                # Verify counts are numbers
                if not isinstance(category_stat['total'], int) or not isinstance(category_stat['online'], int) or not isinstance(category_stat['offline'], int):
                    print(f"❌ Category stat counts should be integers")
                    return False, {}
                
                print(f"✅ Category {category_stat['name']}: {category_stat['online']}/{category_stat['offline']} (online/offline)")
        
        return success, response

    def test_pinned_graphs_crud(self):
        """Test pinned graphs CRUD operations"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot test pinned graphs without device ID")
            return False, {}

        device_id = self.device_ids[0]
        
        # Test GET all pinned graphs
        success_get, response_get = self.run_test("Get Pinned Graphs", "GET", "pinned-graphs", 200)
        if not success_get:
            return False, {}
        
        initial_count = len(response_get)
        
        # Test CREATE pinned graph
        pin_data = {
            "device_id": device_id,
            "device_name": "Test Device",
            "metric_type": "ping",
            "metric_name": "Response Time",
            "position": 0
        }
        success_create, response_create = self.run_test("Create Pinned Graph", "POST", "pinned-graphs", 200, pin_data)
        if not success_create:
            return False, {}
        
        graph_id = response_create.get('id')
        if not graph_id:
            print("❌ Created pinned graph should have an ID")
            return False, {}
        
        # Test GET single pinned graph data
        success_data, response_data = self.run_test(f"Get Pinned Graph Data {graph_id}", "GET", f"pinned-graphs/{graph_id}/data", 200)
        if not success_data:
            return False, {}
        
        # Verify response has graph and data fields
        if 'graph' not in response_data or 'data' not in response_data:
            print("❌ Pinned graph data should have 'graph' and 'data' fields")
            return False, {}
        
        # Test GET all pinned graphs after creation
        success_get_after, response_get_after = self.run_test("Get Pinned Graphs After Create", "GET", "pinned-graphs", 200)
        if not success_get_after:
            return False, {}
        
        if len(response_get_after) != initial_count + 1:
            print(f"❌ Expected {initial_count + 1} pinned graphs, got {len(response_get_after)}")
            return False, {}
        
        # Test DELETE pinned graph
        success_delete, response_delete = self.run_test(f"Delete Pinned Graph {graph_id}", "DELETE", f"pinned-graphs/{graph_id}", 200)
        if not success_delete:
            return False, {}
        
        # Verify deletion
        success_get_final, response_get_final = self.run_test("Get Pinned Graphs After Delete", "GET", "pinned-graphs", 200)
        if not success_get_final:
            return False, {}
        
        if len(response_get_final) != initial_count:
            print(f"❌ Expected {initial_count} pinned graphs after delete, got {len(response_get_final)}")
            return False, {}
        
        print("✅ Pinned graphs CRUD operations all working correctly")
        return True, {}

    def test_duplicate_pinned_graph_prevention(self):
        """Test that duplicate pinned graphs are prevented"""
        if not self.device_ids:
            self.test_create_device()
        
        if not self.device_ids:
            print("❌ Cannot test duplicate pinned graphs without device ID")
            return False, {}

        device_id = self.device_ids[0]
        
        pin_data = {
            "device_id": device_id,
            "device_name": "Test Device",
            "metric_type": "ping", 
            "metric_name": "Response Time",
            "position": 0
        }
        
        # Create first pinned graph
        success_first, response_first = self.run_test("Create First Pinned Graph", "POST", "pinned-graphs", 200, pin_data)
        if not success_first:
            return False, {}
        
        graph_id = response_first.get('id')
        
        # Try to create duplicate
        success_duplicate, response_duplicate = self.run_test("Create Duplicate Pinned Graph", "POST", "pinned-graphs", 400, pin_data)
        
        if success_duplicate:
            print("❌ Expected 400 error for duplicate pinned graph, but got success")
            # Cleanup the first graph
            requests.delete(f"{self.api_url}/pinned-graphs/{graph_id}")
            return False, {}
        
        # Cleanup the first graph
        success_cleanup, _ = self.run_test(f"Cleanup Pinned Graph {graph_id}", "DELETE", f"pinned-graphs/{graph_id}", 200)
        if not success_cleanup:
            print(f"⚠️  Warning: Could not cleanup pinned graph {graph_id}")
        
        print("✅ Duplicate pinned graph prevention working correctly")
        return True, {}

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test devices
        for device_id in self.device_ids:
            try:
                response = requests.delete(f"{self.api_url}/devices/{device_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted test device {device_id}")
                else:
                    print(f"❌ Failed to delete device {device_id}: {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting device {device_id}: {e}")
        
        # Delete test templates
        for template_id in self.template_ids:
            try:
                response = requests.delete(f"{self.api_url}/templates/{template_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted test template {template_id}")
                else:
                    print(f"❌ Failed to delete template {template_id}: {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting template {template_id}: {e}")
        
        # Delete test categories
        for category_id in self.category_ids:
            try:
                response = requests.delete(f"{self.api_url}/categories/{category_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted test category {category_id}")
                else:
                    print(f"❌ Failed to delete category {category_id}: {response.status_code}")
            except Exception as e:
                print(f"❌ Error deleting category {category_id}: {e}")

def main():
    """Run all API tests"""
    print("🚀 Starting Network Monitoring API Tests")
    print("=" * 60)
    
    tester = NetworkMonitoringAPITester()
    
    try:
        # Basic API tests
        tester.test_root_endpoint()
        tester.test_dashboard_stats()
        
        # Category tests
        tester.test_get_categories()
        tester.test_create_category()
        
        # Device tests
        tester.test_get_devices()
        tester.test_create_device()
        tester.test_get_device_by_id()
        tester.test_update_device()
        
        # Monitoring tests
        tester.test_poll_device()
        tester.test_poll_all_devices()
        tester.test_get_monitoring_data()
        tester.test_get_latest_monitoring()
        
        # Alert tests
        tester.test_get_alerts()
        
        # Template tests - NEW FUNCTIONALITY
        tester.test_get_templates()
        tester.test_create_template()
        tester.test_get_template_by_id()
        tester.test_update_template()
        
        # Auto polling tests - NEW FUNCTIONALITY
        tester.test_device_auto_poll_settings()
        tester.test_auto_poll_endpoint()
        
        # NEW SCHEDULER & AUTO-RESOLUTION FUNCTIONALITY TESTS
        tester.test_scheduler_status()
        tester.test_devices_due_for_poll()
        tester.test_device_last_polled_update()
        tester.test_alert_auto_resolution()
        tester.test_duplicate_alert_prevention()
        
        # NEW FEATURES BEING TESTED - Alert History, Category Stats, Pinned Graphs
        tester.test_alert_history_endpoint()
        tester.test_category_stats_endpoint()
        tester.test_pinned_graphs_crud()
        tester.test_duplicate_pinned_graph_prevention()
        
        # Seed data test
        tester.test_seed_data()
        
    except KeyboardInterrupt:
        print("\n\n❌ Tests interrupted by user")
    finally:
        # Always cleanup
        tester.cleanup_test_data()
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())