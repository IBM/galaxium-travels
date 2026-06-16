"""
Legacy Inventory Management System
A simple Flask application for warehouse inventory tracking
WARNING: This code contains technical debt and security issues for demonstration purposes
"""

from flask import Flask, request, jsonify
import sqlite3
from db_config import get_db_connection

app = Flask(__name__)

# Legacy spaghetti code - needs refactoring
@app.route('/inventory/add', methods=['POST'])
def add_inventory():
    data = request.get_json()
    item_name = data.get('item_name')
    quantity = data.get('quantity')
    warehouse_id = data.get('warehouse_id')
    
    # No input validation - technical debt
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Direct SQL execution - potential SQL injection
    cursor.execute(f"INSERT INTO inventory (item_name, quantity, warehouse_id) VALUES ('{item_name}', {quantity}, {warehouse_id})")
    conn.commit()
    
    item_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'status': 'success', 'item_id': item_id}), 201

@app.route('/inventory/<int:item_id>', methods=['GET'])
def get_inventory(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(f"SELECT * FROM inventory WHERE id = {item_id}")
    item = cursor.fetchone()
    conn.close()
    
    if item:
        return jsonify({
            'id': item[0],
            'item_name': item[1],
            'quantity': item[2],
            'warehouse_id': item[3]
        })
    else:
        return jsonify({'error': 'Item not found'}), 404

@app.route('/inventory/update/<int:item_id>', methods=['PUT'])
def update_inventory(item_id):
    data = request.get_json()
    quantity = data.get('quantity')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # More legacy code with no error handling
    cursor.execute(f"UPDATE inventory SET quantity = {quantity} WHERE id = {item_id}")
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'updated'})

@app.route('/inventory/delete/<int:item_id>', methods=['DELETE'])
def delete_inventory(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(f"DELETE FROM inventory WHERE id = {item_id}")
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'deleted'})

@app.route('/inventory/list', methods=['GET'])
def list_inventory():
    warehouse_id = request.args.get('warehouse_id')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if warehouse_id:
        # Vulnerable to SQL injection
        cursor.execute(f"SELECT * FROM inventory WHERE warehouse_id = {warehouse_id}")
    else:
        cursor.execute("SELECT * FROM inventory")
    
    items = cursor.fetchall()
    conn.close()
    
    inventory_list = []
    for item in items:
        inventory_list.append({
            'id': item[0],
            'item_name': item[1],
            'quantity': item[2],
            'warehouse_id': item[3]
        })
    
    return jsonify(inventory_list)
@app.route('/search', methods=['GET'])
def search_inventory():
    name = request.args.get('name', '')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # FIXED: Using parameterized query to prevent SQL injection
    query = "SELECT * FROM inventory WHERE item_name LIKE ?"
    search_pattern = f'%{name}%'
    cursor.execute(query, (search_pattern,))
    
    items = cursor.fetchall()
    conn.close()
    
    results = []
    for item in items:
        results.append({
            'id': item[0],
            'item_name': item[1],
            'quantity': item[2],
            'warehouse_id': item[3]
        })
    
    return jsonify(results)


# Initialize database on startup
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    # Running in debug mode in production - security risk
    app.run(debug=True, host='0.0.0.0', port=5000)

# Made with Bob
