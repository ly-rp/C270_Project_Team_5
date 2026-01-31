from flask import Flask, render_template, jsonify, request
import pymysql
import os #imports are for the database, please do not remove! -Eleanor

app = Flask(__name__)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'yttlzg.h.filess.io'),
    'port': int(os.getenv('DB_PORT', 3307)),
    'user': os.getenv('DB_USER', 'ttt_app_listweight'),
    'password': os.getenv('DB_PASSWORD', '15c5b65ce12d927dd44652183d83a44196a54474'),
    'database': os.getenv('DB_NAME', 'ttt_app_listweight'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"Database connection error: {e}") #should show if error when running, not when github running -Eleanor
        return None

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/leaderboard", methods=['GET'])
def get_leaderboard():
    """Fetch top 10 players from leaderboard sorted by best_score"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            query = """
                SELECT id, name, best_score as best, created_at, updated_at
                FROM leaderboard
                ORDER BY best_score DESC
                LIMIT 10
            """
            cursor.execute(query)
            results = cursor.fetchall()
            return jsonify(results), 200
    except Exception as e:
        print(f"Error fetching leaderboard: {e}")
        return jsonify({'error': 'Failed to fetch leaderboard'}), 500
    finally:
        connection.close()

@app.route("/api/leaderboard", methods=['POST'])
def update_leaderboard():
    """Add or update a player's score in the leaderboard"""
    data = request.get_json()
    
    if not data or 'name' not in data or 'score' not in data:
        return jsonify({'error': 'Missing name or score'}), 400
    
    name = data['name'].strip()
    score = data['score']
    
    if not name or len(name) > 100:
        return jsonify({'error': 'Invalid name'}), 400
    
    try:
        score = int(score)
        if score < 0:
            return jsonify({'error': 'Score must be non-negative'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid score'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if player exists
            cursor.execute("SELECT id, best_score FROM leaderboard WHERE name = %s", (name,))
            existing = cursor.fetchone()
            
            if existing:
                # Update only if new score is better
                if score > existing['best_score']:
                    cursor.execute(
                        "UPDATE leaderboard SET best_score = %s WHERE id = %s",
                        (score, existing['id'])
                    )
                    connection.commit()
                    return jsonify({'message': 'Score updated', 'updated': True}), 200
                else:
                    return jsonify({'message': 'Score not better than existing', 'updated': False}), 200
            else:
                # Insert new player
                cursor.execute(
                    "INSERT INTO leaderboard (name, best_score) VALUES (%s, %s)",
                    (name, score)
                )
                connection.commit()
                return jsonify({'message': 'Player added to leaderboard', 'updated': True}), 201
    except Exception as e:
        print(f"Error updating leaderboard: {e}")
        return jsonify({'error': 'Failed to update leaderboard'}), 500
    finally:
        connection.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=False, port=3306)
