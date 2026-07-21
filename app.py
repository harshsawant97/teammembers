from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, Response
import psycopg2
import psycopg2.extras
import psycopg2.errors
import os
import base64
import datetime
import csv
import json
import cv2
import numpy as np

app = Flask(__name__)
app.secret_key = 'super_secret_key'

UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

models_dir = os.path.join('static', 'models')
yunet_path = os.path.join(models_dir, "face_detection_yunet_2023mar.onnx")
sface_path = os.path.join(models_dir, "face_recognition_sface_2021dec.onnx")

global_detector = None
global_recognizer = None

def get_ai_models():
    global global_detector, global_recognizer
    if global_detector is None or global_recognizer is None:
        if os.path.exists(yunet_path) and os.path.exists(sface_path):
            global_detector = cv2.FaceDetectorYN.create(yunet_path, "", (320, 320))
            global_recognizer = cv2.FaceRecognizerSF.create(sface_path, "")
    return global_detector, global_recognizer

UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

DB_URL = os.environ.get('DATABASE_URL', 'postgresql://attendance_db_3cjz_user:eQonJQgQHus6QEglqfxvmAP6NmWeiqU3@dpg-d9fejk7avr4c73c2vqag-a/attendance_db_3cjz')

class PostgresWrapper:
    def __init__(self, conn):
        self.conn = conn

    def execute(self, query, params=None):
        query = query.replace('?', '%s')
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return cursor
        
    def commit(self):
        self.conn.commit()
        
    def close(self):
        self.conn.close()

def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        return PostgresWrapper(conn)
    except Exception as e:
        print("Database connection failed. Ensure you are running this on Render (using Internal DB URL).")
        raise e

def init_db():
    try:
        conn = get_db_connection()
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                subject TEXT,
                face_features TEXT,
                email TEXT,
                reset_token TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                date TEXT NOT NULL,
                student_id INTEGER NOT NULL,
                subject TEXT NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY (student_id) REFERENCES users (id)
            )
        ''')
        # Create default admin if it doesn't exist
        admin_exists = conn.execute("SELECT id FROM users WHERE username='admin'").fetchone()
        if not admin_exists:
            from werkzeug.security import generate_password_hash
            hashed = generate_password_hash('admin123')
            conn.execute("INSERT INTO users (username, password, role) VALUES ('admin', %s, 'admin')", (hashed,))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Skipping init_db during local dev due to connection issues: {e}")

# We try to init_db on startup if possible
init_db()

from werkzeug.security import generate_password_hash, check_password_hash

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        # Admin exception since originally we stored plain text
        if user and (check_password_hash(user['password'], password) or user['password'] == password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            session['subject'] = user['subject'] if user['subject'] else "General"
            
            if user['role'] == 'teacher':
                return redirect(url_for('teacher_dashboard'))
            elif user['role'] == 'admin':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('student_dashboard'))
        else:
            flash('Invalid username or password!')
            
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        role = request.form['role']
        subject = request.form.get('subject') # Optional from form
        
        hashed_password = generate_password_hash(password)
        
        conn = get_db_connection()
        try:
            conn.execute('INSERT INTO users (username, password, role, subject) VALUES (?, ?, ?, ?)', 
                         (username, hashed_password, role, subject))
            conn.commit()
            flash('Account created successfully! You can now log in.')
            return redirect(url_for('login'))
        except psycopg2.errors.UniqueViolation:
            conn.conn.rollback()
            flash('Username already exists! Please choose another one.')
        finally:
            conn.close()
            
    return render_template('signup.html')

@app.route('/admin')
def admin_dashboard():
    if 'user_id' not in session or session['role'] != 'admin':
        return redirect(url_for('login'))
        
    conn = get_db_connection()
    users = conn.execute('SELECT * FROM users').fetchall()
    logs = conn.execute('''
        SELECT users.username, attendance.status, attendance.date 
        FROM attendance 
        JOIN users ON attendance.student_id = users.id 
        ORDER BY date DESC
    ''').fetchall()
    conn.close()
    
    return render_template('admin_dashboard.html', users=users, logs=logs)

@app.route('/delete_user/<int:id>')
def delete_user(id):
    if 'user_id' not in session or session['role'] != 'admin':
        return redirect(url_for('login'))
        
    conn = get_db_connection()
    conn.execute('DELETE FROM users WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return redirect(url_for('admin_dashboard'))

@app.route('/assign_subject/<int:id>', methods=['POST'])
def assign_subject(id):
    if 'user_id' not in session or session['role'] != 'admin':
        return redirect(url_for('login'))
        
    subject = request.form.get('subject')
    conn = get_db_connection()
    conn.execute('UPDATE users SET subject = ? WHERE id = ?', (subject, id))
    conn.commit()
    conn.close()
    return redirect(url_for('admin_dashboard'))

@app.route('/teacher-dashboard')
def teacher_dashboard():
    if 'user_id' not in session or session['role'] != 'teacher':
        return redirect(url_for('login'))
        
    conn = get_db_connection()
    subject = session.get('subject') or "General"
    selected_date = request.args.get('date', datetime.date.today().strftime("%Y-%m-%d"))
    
    # Get all students
    all_students = conn.execute("SELECT id, username FROM users WHERE role = 'student'").fetchall()
    
    # Get attendance for selected date
    attendance_records = conn.execute('''
        SELECT student_id, status 
        FROM attendance 
        WHERE date = ? AND subject = ?
    ''', (selected_date, subject)).fetchall()
    
    # Map student_id to status
    attendance_map = {row['student_id']: row['status'] for row in attendance_records}
    
    # Build complete roster
    logs = []
    for student in all_students:
        status = attendance_map.get(student['id'], 'Absent')
        logs.append({
            'student_id': student['id'],
            'username': student['username'],
            'date': selected_date,
            'status': status
        })
    
    total_students = len(all_students)
    total_lectures = conn.execute('SELECT COUNT(DISTINCT date) FROM attendance WHERE subject = ?', (subject,)).fetchone()[0]
    today_present = len(attendance_records)
    
    conn.close()
    
    return render_template('teacher_dashboard.html', 
                           username=session['username'], 
                           subject=subject,
                           logs=logs,
                           selected_date=selected_date,
                           total_students=total_students,
                           total_lectures=total_lectures,
                           today_present=today_present)

@app.route('/manual_mark_present/<int:student_id>/<date>', methods=['POST'])
def manual_mark_present(student_id, date):
    if 'user_id' not in session or session['role'] != 'teacher':
        return redirect(url_for('login'))
        
    subject = session.get('subject') or "General"
    conn = get_db_connection()
    
    exists = conn.execute('SELECT id FROM attendance WHERE student_id = ? AND date = ? AND subject = ?', 
                          (student_id, date, subject)).fetchone()
    if not exists:
        conn.execute('INSERT INTO attendance (date, student_id, subject, status) VALUES (?, ?, ?, ?)', 
                     (date, student_id, subject, 'Present'))
        conn.commit()
    conn.close()
    
    return redirect(url_for('teacher_dashboard', date=date))

@app.route('/export_csv')
def export_csv():
    if 'user_id' not in session or session['role'] != 'teacher':
        return redirect(url_for('login'))
        
    subject = session.get('subject') or "General"
    selected_date = request.args.get('date', datetime.date.today().strftime("%Y-%m-%d"))
    
    conn = get_db_connection()
    all_students = conn.execute("SELECT id, username FROM users WHERE role = 'student'").fetchall()
    attendance_records = conn.execute('SELECT student_id, status FROM attendance WHERE date = ? AND subject = ?', (selected_date, subject)).fetchall()
    conn.close()
    
    attendance_map = {row['student_id']: row['status'] for row in attendance_records}
    
    def generate():
        data = [['Student ID', 'Student Name', 'Date', 'Status']]
        for student in all_students:
            status = attendance_map.get(student['id'], 'Absent')
            data.append([student['id'], student['username'], selected_date, status])
            
        for row in data:
            yield ','.join(map(str, row)) + '\n'
            
    headers = {
        'Content-Disposition': f'attachment; filename=attendance_{subject}_{selected_date}.csv',
        'Content-Type': 'text/csv'
    }
    return Response(generate(), headers=headers)

@app.route('/student-dashboard')
def student_dashboard():
    if 'user_id' not in session or session['role'] != 'student':
        return redirect(url_for('login'))
        
    conn = get_db_connection()
    user = conn.execute('SELECT face_features FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    face_registered = bool(user and user['face_features'])
    
    subjects = ['EM-2', 'Engineering Physics', 'DSDA', 'FCSN', 'FCPP']
    student_stats = []
    
    for sub in subjects:
        total_lec = conn.execute('SELECT COUNT(DISTINCT date) FROM attendance WHERE subject = ?', (sub,)).fetchone()[0]
        attended = conn.execute('SELECT COUNT(*) FROM attendance WHERE student_id = ? AND subject = ?', (session['user_id'], sub)).fetchone()[0]
        missed = max(0, total_lec - attended)
        perc = round((attended / total_lec) * 100, 1) if total_lec > 0 else 0.0
        
        student_stats.append({
            'subject': sub,
            'total': total_lec,
            'attended': attended,
            'missed': missed,
            'percentage': perc
        })
        
    conn.close()
    
    return render_template('student_dashboard.html', 
                           username=session['username'], 
                           student_stats=student_stats,
                           face_registered=face_registered)

@app.route('/register_face', methods=['POST'])
def register_face():
    if 'user_id' not in session or session['role'] != 'student':
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json
    image_data = data['image']
    
    encoded_data = image_data.split(',')[1]
    nparr = base64.b64decode(encoded_data)
    
    temp_path = os.path.join(UPLOAD_FOLDER, f"temp_student_{session['user_id']}.jpg")
    with open(temp_path, "wb") as fh:
        fh.write(nparr)
        
    success = False
    
    detector, recognizer = get_ai_models()
    
    if detector is not None and recognizer is not None:
        s_img = cv2.imread(temp_path)
        if s_img is not None:
            height, width, _ = s_img.shape
            detector.setInputSize((width, height))
            
            _, s_faces = detector.detect(s_img)
            if s_faces is not None and len(s_faces) > 0:
                s_face = s_faces[0]
                s_aligned = recognizer.alignCrop(s_img, s_face)
                s_feature = recognizer.feature(s_aligned)
                
                # --- ANTI-FRAUD CHECK ---
                conn = get_db_connection()
                existing_users = conn.execute("SELECT id, face_features FROM users WHERE role = 'student' AND face_features IS NOT NULL AND id != ?", (session['user_id'],)).fetchall()
                
                duplicate_found = False
                for user in existing_users:
                    existing_feature = np.array(json.loads(user['face_features']), dtype=np.float32)
                    score = recognizer.match(s_feature, existing_feature, cv2.FaceRecognizerSF_FR_COSINE)
                    if score >= 0.363:
                        duplicate_found = True
                        break
                        
                if duplicate_found:
                    conn.close()
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    return jsonify({'success': False, 'message': 'Anti-Fraud Alert: This face is already registered to another student account!'})
                # ------------------------
                
                # Turn math features into a string for the database!
                feature_json = json.dumps(s_feature.tolist())
                
                conn.execute('UPDATE users SET face_features = ? WHERE id = ?', (feature_json, session['user_id']))
                conn.commit()
                conn.close()
                success = True

    if os.path.exists(temp_path):
        os.remove(temp_path)
        
    if success:
        return jsonify({'success': True, 'message': 'Face registered successfully!'})
    else:
        return jsonify({'success': False, 'message': 'Face could not be detected.'})

@app.route('/mark_attendance', methods=['POST'])
def mark_attendance():
    if 'user_id' not in session or session['role'] != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json
    image_data = data['image']
    
    encoded_data = image_data.split(',')[1]
    nparr = base64.b64decode(encoded_data)
    
    temp_path = os.path.join(UPLOAD_FOLDER, "temp_classroom.jpg")
    with open(temp_path, "wb") as fh:
        fh.write(nparr)
        
    conn = get_db_connection()
    students = conn.execute("SELECT id, face_features, username FROM users WHERE role = 'student' AND face_features IS NOT NULL").fetchall()
    
    recognized_students = []
    
    detector, recognizer = get_ai_models()
    
    if detector is not None and recognizer is not None:
        img = cv2.imread(temp_path)
        if img is not None:
            height, width, _ = img.shape
            detector.setInputSize((width, height))
            
            _, faces = detector.detect(img)
            faces_in_classroom = faces if faces is not None else []
            
            for student in students:
                match_found = False
                
                # Convert the saved JSON string back into the 128-D math array
                s_feature_list = json.loads(student['face_features'])
                s_feature = np.array(s_feature_list, dtype=np.float32)
                
                detector.setInputSize((width, height)) # reset for classroom faces
                
                for c_face in faces_in_classroom:
                    c_aligned = recognizer.alignCrop(img, c_face)
                    c_feature = recognizer.feature(c_aligned)
                    
                    # Calculate cosine similarity (1.0 is exact match, >= 0.363 is same person)
                    score = recognizer.match(s_feature, c_feature, cv2.FaceRecognizerSF_FR_COSINE)
                    if score >= 0.363:
                        match_found = True
                        break
                        
                if match_found and not any(rs['id'] == student['id'] for rs in recognized_students):
                    recognized_students.append(student)
            
    teacher_subject = session.get('subject') or "General"
            
    for student in recognized_students:
        today = datetime.date.today().strftime("%Y-%m-%d")
        exists = conn.execute('SELECT id FROM attendance WHERE student_id = ? AND date = ? AND subject = ?', 
                              (student['id'], today, teacher_subject)).fetchone()
        if not exists:
            conn.execute('INSERT INTO attendance (date, student_id, subject, status) VALUES (?, ?, ?, ?)', 
                         (today, student['id'], teacher_subject, 'Present'))
            
    conn.commit()
    conn.close()
    
    if os.path.exists(temp_path):
        os.remove(temp_path)
        
    names = [s['username'] for s in recognized_students]
    
    return jsonify({
        'success': True, 
        'message': f"Attendance marked for: {', '.join(names) if names else 'No one recognized'}"
    })

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)
