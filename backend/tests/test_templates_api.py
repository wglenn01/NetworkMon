"""
Backend API tests for Network Monitoring Tool - Template Features
Tests: Template CRUD, Template Editing, Apply to Devices
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API health check: {data['message']}")


class TestDashboardStats:
    """Dashboard stats endpoint tests"""
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_devices" in data
        assert "online_devices" in data
        assert "offline_devices" in data
        assert "active_alerts" in data
        assert "devices_by_category" in data
        print(f"Dashboard stats: {data}")


class TestSchedulerStatus:
    """Scheduler status endpoint tests"""
    
    def test_scheduler_status(self):
        """Test scheduler status endpoint"""
        response = requests.get(f"{BASE_URL}/api/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        assert "scheduler_running" in data
        assert "auto_poll_enabled_devices" in data
        print(f"Scheduler status: running={data['scheduler_running']}, devices={data['auto_poll_enabled_devices']}")


class TestTemplatesAPI:
    """Template CRUD and application tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test - create a unique test template"""
        self.test_template_id = None
        yield
        # Cleanup: delete test template if created
        if self.test_template_id:
            try:
                requests.delete(f"{BASE_URL}/api/templates/{self.test_template_id}")
            except:
                pass
    
    def test_list_templates(self):
        """Test GET /api/templates - list all templates"""
        response = requests.get(f"{BASE_URL}/api/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} templates")
        
        # Verify template structure if any exist
        if len(data) > 0:
            template = data[0]
            assert "id" in template
            assert "name" in template
            assert "oids" in template
            print(f"First template: {template['name']} with {len(template['oids'])} OIDs")
    
    def test_create_template(self):
        """Test POST /api/templates - create new template"""
        test_name = f"TEST_Template_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": test_name,
            "brand": "TestBrand",
            "description": "Test template for automated testing",
            "oids": [
                {
                    "oid": "1.3.6.1.2.1.1.3.0",
                    "name": "Test Uptime",
                    "unit": "s",
                    "data_type": "counter",
                    "threshold_operator": "gt",
                    "threshold_warning": 1000,
                    "threshold_critical": 5000
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/templates", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Store for cleanup
        self.test_template_id = data["id"]
        
        # Verify response structure
        assert data["name"] == test_name
        assert data["brand"] == "TestBrand"
        assert len(data["oids"]) == 1
        assert data["oids"][0]["oid"] == "1.3.6.1.2.1.1.3.0"
        assert data["oids"][0]["threshold_warning"] == 1000
        print(f"Created template: {data['name']} (id: {data['id']})")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/templates/{self.test_template_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["name"] == test_name
    
    def test_update_template(self):
        """Test PUT /api/templates/{id} - update template OIDs and thresholds"""
        # First create a template
        test_name = f"TEST_UpdateTemplate_{uuid.uuid4().hex[:8]}"
        create_payload = {
            "name": test_name,
            "brand": "TestBrand",
            "description": "Template to be updated",
            "oids": [
                {
                    "oid": "1.3.6.1.2.1.1.1.0",
                    "name": "Original Name",
                    "unit": "",
                    "data_type": "gauge",
                    "threshold_operator": "gt",
                    "threshold_warning": 50,
                    "threshold_critical": 80
                }
            ]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/templates", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        self.test_template_id = created["id"]
        print(f"Created template for update test: {created['id']}")
        
        # Now update the template - modify OID thresholds
        update_payload = {
            "name": test_name,  # Keep same name
            "brand": "UpdatedBrand",
            "description": "Updated description",
            "oids": [
                {
                    "oid": "1.3.6.1.2.1.1.1.0",
                    "name": "Updated Name",
                    "unit": "%",
                    "data_type": "percentage",
                    "threshold_operator": "lt",  # Changed operator
                    "threshold_warning": 30,      # Changed thresholds
                    "threshold_critical": 10
                },
                {
                    "oid": "1.3.6.1.2.1.1.3.0",
                    "name": "New OID Added",
                    "unit": "s",
                    "data_type": "counter",
                    "threshold_operator": "gt",
                    "threshold_warning": None,
                    "threshold_critical": None
                }
            ]
        }
        
        update_response = requests.put(f"{BASE_URL}/api/templates/{self.test_template_id}", json=update_payload)
        assert update_response.status_code == 200
        updated = update_response.json()
        
        # Verify updates persisted
        assert updated["brand"] == "UpdatedBrand"
        assert updated["description"] == "Updated description"
        assert len(updated["oids"]) == 2
        
        # Check first OID was updated
        first_oid = updated["oids"][0]
        assert first_oid["name"] == "Updated Name"
        assert first_oid["data_type"] == "percentage"
        assert first_oid["threshold_operator"] == "lt"
        assert first_oid["threshold_warning"] == 30
        assert first_oid["threshold_critical"] == 10
        
        print(f"Template updated successfully - now has {len(updated['oids'])} OIDs")
        
        # Verify by GET request
        get_response = requests.get(f"{BASE_URL}/api/templates/{self.test_template_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert len(get_data["oids"]) == 2
        assert get_data["oids"][0]["threshold_warning"] == 30
    
    def test_delete_template(self):
        """Test DELETE /api/templates/{id}"""
        # Create a template to delete
        test_name = f"TEST_DeleteTemplate_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": test_name,
            "brand": "DeleteTest",
            "oids": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/templates", json=payload)
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        
        # Delete the template
        delete_response = requests.delete(f"{BASE_URL}/api/templates/{template_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/templates/{template_id}")
        assert get_response.status_code == 404
        print(f"Template {template_id} deleted successfully")


class TestTemplateApplyToDevices:
    """Test template apply to devices functionality"""
    
    def test_apply_template_to_devices(self):
        """Test POST /api/templates/{id}/apply-to-devices"""
        # Get existing templates
        templates_response = requests.get(f"{BASE_URL}/api/templates")
        assert templates_response.status_code == 200
        templates = templates_response.json()
        
        if len(templates) == 0:
            pytest.skip("No templates available for apply test")
        
        # Pick a template (preferably one with OIDs)
        template = next((t for t in templates if len(t.get('oids', [])) > 0), templates[0])
        template_id = template["id"]
        
        # Apply template to devices
        response = requests.post(f"{BASE_URL}/api/templates/{template_id}/apply-to-devices")
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "updated_devices" in data
        print(f"Apply result: {data['message']}, updated {data['updated_devices']} devices")
    
    def test_apply_nonexistent_template(self):
        """Test applying a non-existent template returns 404"""
        fake_id = "nonexistent-template-id"
        response = requests.post(f"{BASE_URL}/api/templates/{fake_id}/apply-to-devices")
        assert response.status_code == 404


class TestAlertsAPI:
    """Alert endpoint tests"""
    
    def test_list_alerts(self):
        """Test GET /api/alerts"""
        response = requests.get(f"{BASE_URL}/api/alerts?hours=24")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} alerts in last 24 hours")
        
        if len(data) > 0:
            alert = data[0]
            assert "id" in alert
            assert "device_name" in alert
            assert "alert_type" in alert
            assert "message" in alert
            assert "acknowledged" in alert


class TestDevicesAPI:
    """Device endpoint tests"""
    
    def test_list_devices(self):
        """Test GET /api/devices"""
        response = requests.get(f"{BASE_URL}/api/devices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} devices")
        
        if len(data) > 0:
            device = data[0]
            assert "id" in device
            assert "name" in device
            assert "ip_address" in device
            assert "status" in device
            assert "oids" in device


class TestCategoriesAPI:
    """Category endpoint tests"""
    
    def test_list_categories(self):
        """Test GET /api/categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} categories")
    
    def test_category_stats(self):
        """Test GET /api/categories/stats"""
        response = requests.get(f"{BASE_URL}/api/categories/stats")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            stat = data[0]
            assert "id" in stat
            assert "name" in stat
            assert "total" in stat
            assert "online" in stat
            assert "offline" in stat
            print(f"First category stat: {stat['name']} - {stat['online']}/{stat['total']} online")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
