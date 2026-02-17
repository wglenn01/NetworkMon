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