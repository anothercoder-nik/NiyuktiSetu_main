-- Add interview candidates table (NIC Government Database simulation)
USE niyuktisetu;

CREATE TABLE IF NOT EXISTS interview_candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid VARCHAR(50) NOT NULL UNIQUE,
    roll_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    reference_image_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rfid (rfid),
    INDEX idx_roll_no (roll_no),
    INDEX idx_dob (dob)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert dummy NIC government database records
INSERT INTO interview_candidates (rfid, roll_no, name, dob, reference_image_path) VALUES
('RFID001234', 'ROLL2024001', 'Nikunj Agarwal', '2002-04-15', 'uploads/candidates/nikunj_ref.jpg'),
('RFID001235', 'ROLL2024002', 'Shreya Sharma', '2003-11-22', 'uploads/candidates/shreya_ref.jpg'),
('RFID001236', 'ROLL2024003', 'Rahul Kumar', '2002-08-10', 'uploads/candidates/rahul_ref.jpg'),
('RFID001237', 'ROLL2024004', 'Priya Singh', '2003-02-28', 'uploads/candidates/priya_ref.jpg'),
('RFID001238', 'ROLL2024005', 'Amit Verma', '2002-12-05', 'uploads/candidates/amit_ref.jpg');

-- Add interview verification logs table
CREATE TABLE IF NOT EXISTS interview_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    rfid VARCHAR(50) NOT NULL,
    roll_no VARCHAR(50) NOT NULL,
    credentials_verified BOOLEAN DEFAULT FALSE,
    face_verified BOOLEAN DEFAULT FALSE,
    confidence_score DECIMAL(5,2),
    live_image_path VARCHAR(500),
    verification_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    FOREIGN KEY (candidate_id) REFERENCES interview_candidates(id) ON DELETE CASCADE,
    INDEX idx_candidate_id (candidate_id),
    INDEX idx_status (status),
    INDEX idx_timestamp (verification_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
