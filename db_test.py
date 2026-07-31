import psycopg2

try:
    conn = psycopg2.connect(
        host="35.200.196.113",
        port="5432",
        dbname="postgres",
        user="postgres",
        password=r"8S5]U3@L^Xz)\FH}"
    )
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    record = cursor.fetchone()
    print("You are connected to - ", record)
    
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';")
    columns = cursor.fetchall()
    print("Users table columns:", columns)

except Exception as error:
    print("Error while connecting to PostgreSQL", error)
finally:
    if conn:
        cursor.close()
        conn.close()
