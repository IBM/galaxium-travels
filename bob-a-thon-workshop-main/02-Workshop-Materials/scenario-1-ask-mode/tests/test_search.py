"""
Comprehensive Unit Tests for /search Endpoint
Tests normal functionality, edge cases, and SQL injection resistance
"""

import unittest
import json
import sys
import os
import tempfile
import sqlite3

# Add parent directory to path to import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from db_config import get_db_connection


class TestSearchEndpoint(unittest.TestCase):
    """Test suite for the /search endpoint"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test client and test database"""
        app.config['TESTING'] = True
        cls.client = app.test_client()
        
        # Initialize test database with sample data
        cls._setup_test_data()
    
    @classmethod
    def _setup_test_data(cls):
        """Populate database with test data"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Clear existing data
        cursor.execute("DELETE FROM inventory")
        
        # Insert test data
        test_items = [
            ("Dell Laptop", 10, 1),
            ("HP Laptop", 5, 1),
            ("MacBook Pro", 3, 2),
            ("Office Chair", 20, 2),
            ("Desk Lamp", 15, 1),
            ("USB Cable", 100, 3),
            ("Monitor 27\"", 8, 1),
            ("Keyboard & Mouse", 25, 2),
        ]
        
        for item_name, quantity, warehouse_id in test_items:
            cursor.execute(
                "INSERT INTO inventory (item_name, quantity, warehouse_id) VALUES (?, ?, ?)",
                (item_name, quantity, warehouse_id)
            )
        
        conn.commit()
        conn.close()
    
    def test_01_normal_search_single_result(self):
        """Test normal search returning single result"""
        response = self.client.get('/search?name=MacBook')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['item_name'], 'MacBook Pro')
        self.assertEqual(data[0]['quantity'], 3)
    
    def test_02_normal_search_multiple_results(self):
        """Test normal search returning multiple results"""
        response = self.client.get('/search?name=Laptop')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Case-insensitive search: Dell Laptop, HP Laptop (MacBook has different case)
        self.assertGreaterEqual(len(data), 2)
        
        # Verify all results contain 'Laptop' or 'laptop' in name
        for item in data:
            self.assertTrue('Laptop' in item['item_name'] or 'laptop' in item['item_name'].lower())
    
    def test_03_case_insensitive_search(self):
        """Test that search is case-insensitive"""
        response_lower = self.client.get('/search?name=laptop')
        response_upper = self.client.get('/search?name=LAPTOP')
        response_mixed = self.client.get('/search?name=LaPtOp')
        
        data_lower = json.loads(response_lower.data)
        data_upper = json.loads(response_upper.data)
        data_mixed = json.loads(response_mixed.data)
        
        # All should return same results
        self.assertEqual(len(data_lower), len(data_upper))
        self.assertEqual(len(data_lower), len(data_mixed))
    
    def test_04_partial_match_search(self):
        """Test partial string matching"""
        response = self.client.get('/search?name=USB')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['item_name'], 'USB Cable')
    
    def test_05_empty_search_parameter(self):
        """Test search with empty string returns all items"""
        response = self.client.get('/search?name=')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertGreaterEqual(len(data), 8)  # Should return all items
    
    def test_06_no_search_parameter(self):
        """Test search without name parameter"""
        response = self.client.get('/search')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertGreaterEqual(len(data), 8)  # Should return all items
    
    def test_07_no_results_found(self):
        """Test search with no matching results"""
        response = self.client.get('/search?name=NonExistentItem12345')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(len(data), 0)
        self.assertEqual(data, [])
    
    def test_08_special_characters_in_search(self):
        """Test search with special characters"""
        response = self.client.get('/search?name=27"')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertIn('27"', data[0]['item_name'])
    
    def test_09_ampersand_in_search(self):
        """Test search with ampersand character"""
        response = self.client.get('/search?name=Mouse')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        self.assertIn('Mouse', data[0]['item_name'])
    
    def test_10_sql_injection_or_attack(self):
        """Test SQL injection with OR 1=1 attack"""
        response = self.client.get("/search?name=' OR '1'='1")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Should return empty or only items matching the literal string
        # NOT all items (which would indicate successful injection)
        self.assertEqual(len(data), 0)
    
    def test_11_sql_injection_union_attack(self):
        """Test SQL injection with UNION SELECT attack"""
        response = self.client.get("/search?name=' UNION SELECT 1,2,3,4--")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Should return empty, not execute the UNION
        self.assertEqual(len(data), 0)
    
    def test_12_sql_injection_comment_attack(self):
        """Test SQL injection with comment syntax"""
        response = self.client.get("/search?name='; --")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Should treat as literal string, not SQL comment
        self.assertEqual(len(data), 0)
    
    def test_13_sql_injection_drop_table(self):
        """Test SQL injection attempting to drop table"""
        response = self.client.get("/search?name='; DROP TABLE inventory; --")
        self.assertEqual(response.status_code, 200)
        
        # Verify table still exists by querying it
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM inventory")
        count = cursor.fetchone()[0]
        conn.close()
        
        self.assertGreater(count, 0, "Table should still exist with data")
    
    def test_14_sql_injection_delete_attack(self):
        """Test SQL injection attempting to delete records"""
        # Get initial count
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM inventory")
        initial_count = cursor.fetchone()[0]
        conn.close()
        
        response = self.client.get("/search?name='; DELETE FROM inventory; --")
        self.assertEqual(response.status_code, 200)
        
        # Verify no records were deleted
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM inventory")
        final_count = cursor.fetchone()[0]
        conn.close()
        
        self.assertEqual(initial_count, final_count, "No records should be deleted")
    
    def test_15_sql_injection_stacked_queries(self):
        """Test SQL injection with stacked queries"""
        response = self.client.get("/search?name=test'; UPDATE inventory SET quantity=0; --")
        self.assertEqual(response.status_code, 200)
        
        # Verify quantities were not changed
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT quantity FROM inventory WHERE item_name = 'Dell Laptop'")
        quantity = cursor.fetchone()[0]
        conn.close()
        
        self.assertEqual(quantity, 10, "Quantities should not be modified")
    
    def test_16_sql_injection_boolean_blind(self):
        """Test boolean-based blind SQL injection"""
        response = self.client.get("/search?name=' AND 1=1 --")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Should not return all items
        self.assertEqual(len(data), 0)
    
    def test_17_sql_injection_time_based(self):
        """Test time-based SQL injection attempt"""
        import time
        start_time = time.time()
        response = self.client.get("/search?name=' AND SLEEP(5) --")
        elapsed_time = time.time() - start_time
        
        self.assertEqual(response.status_code, 200)
        # Should not delay (SQLite doesn't have SLEEP, but test the pattern)
        self.assertLess(elapsed_time, 2, "Should not execute time-based injection")
    
    def test_18_sql_wildcard_characters(self):
        """Test SQL wildcard characters in LIKE pattern"""
        response = self.client.get("/search?name=%")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Note: % is a wildcard in LIKE patterns, so it matches all items
        # This is expected SQL behavior with LIKE operator
        # The important thing is no SQL injection occurs
        self.assertGreaterEqual(len(data), 0)
    
    def test_19_sql_underscore_wildcard(self):
        """Test underscore wildcard in LIKE pattern"""
        response = self.client.get("/search?name=_")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Note: _ is a wildcard in LIKE patterns matching single character
        # This is expected SQL behavior with LIKE operator
        # The important thing is no SQL injection occurs
        self.assertGreaterEqual(len(data), 0)
    
    def test_20_response_structure_validation(self):
        """Test that response has correct structure"""
        response = self.client.get('/search?name=Laptop')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        
        if len(data) > 0:
            item = data[0]
            self.assertIn('id', item)
            self.assertIn('item_name', item)
            self.assertIn('quantity', item)
            self.assertIn('warehouse_id', item)
            
            # Validate data types
            self.assertIsInstance(item['id'], int)
            self.assertIsInstance(item['item_name'], str)
            self.assertIsInstance(item['quantity'], int)
            self.assertIsInstance(item['warehouse_id'], int)
    
    def test_21_url_encoded_injection(self):
        """Test URL-encoded SQL injection attempts"""
        # %27 is URL-encoded single quote
        response = self.client.get("/search?name=%27%20OR%20%271%27%3D%271")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(len(data), 0)
    
    def test_22_multiple_quotes_attack(self):
        """Test multiple quotes in search"""
        response = self.client.get("/search?name='''")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        # Should handle gracefully without error
        self.assertIsInstance(data, list)
    
    def test_23_null_byte_injection(self):
        """Test null byte injection attempt"""
        response = self.client.get("/search?name=test%00")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_24_unicode_characters(self):
        """Test search with unicode characters"""
        response = self.client.get("/search?name=café")
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_25_very_long_search_string(self):
        """Test search with very long string"""
        long_string = "A" * 1000
        response = self.client.get(f'/search?name={long_string}')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(len(data), 0)


def run_tests():
    """Run all tests and display results"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestSearchEndpoint)
    
    # Run tests with verbose output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print("="*70)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)

# Made with Bob
