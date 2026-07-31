import os
import psycopg2
from passlib.context import CryptContext

DB_HOST = os.getenv("DB_HOST", "35.200.196.113")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", r"8S5]U3@L^Xz)\FH}")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def add_demo_user():
    conn = psycopg2.connect(
        host=DB_HOST, user=DB_USER, password=DB_PASS, dbname=DB_NAME, port=DB_PORT
    )
    conn.autocommit = True
    try:
        cur = conn.cursor()
        # Create the executive id and insert into users
        exec_id = 9999
        cur.execute("""
            INSERT INTO users (id, name, role, email, phone) 
            VALUES (%s, %s, %s, %s, %s) 
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;
        """, (exec_id, "John Doe", "Demo Executive", "test@letzryd.com", "0000000000"))
        
        # Insert into app_users
        password_hash = pwd_context.hash("123456")
        cur.execute("""
            INSERT INTO app_users (username, password_hash, executive_id) 
            VALUES (%s, %s, %s)
            ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash, executive_id=EXCLUDED.executive_id;
        """, ("test", password_hash, exec_id))
        
        print("Demo user created successfully.")
    except Exception as e:
        print("Error:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    add_demo_user()
