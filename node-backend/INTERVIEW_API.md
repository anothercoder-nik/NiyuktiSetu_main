# Interview Login & Face Verification API

## 🎯 Overview

Complete interview authentication system with:
- RFID + Roll No + DOB verification against NIC Government Database
- Live face capture verification against reference passport photo
- Integration with face_verification_api model

## 📋 Database Setup

### 1. Run SQL Migration

In MySQL Workbench:
```sql
-- Open and execute: database/interview_candidates.sql
```

Or via command line:
```bash
mysql -u root -p < database/interview_candidates.sql
```

This creates:
- `interview_candidates` table (NIC Government Database)
- `interview_verifications` table (Verification logs)
- 5 dummy candidate records

### 2. Setup Directory Structure

```bash
node setup-directories.js
```

This creates:
- `uploads/candidates/` - For reference passport images
- `uploads/live_captures/` - For live captured images

### 3. Add Reference Images

Place passport-size reference images in `uploads/candidates/`:
- `nikunj_ref.jpg` (RFID001234, ROLL2024001, DOB: 2002-04-15)
- `shreya_ref.jpg` (RFID001235, ROLL2024002, DOB: 2003-11-22)
- `rahul_ref.jpg` (RFID001236, ROLL2024003, DOB: 2002-08-10)
- `priya_ref.jpg` (RFID001237, ROLL2024004, DOB: 2003-02-28)
- `amit_ref.jpg` (RFID001238, ROLL2024005, DOB: 2002-12-05)

## 🚀 API Endpoints

### 1. Interview Login (Credentials Verification)

**POST** `/interview/interview-login`

Verifies RFID, Roll No, and DOB against NIC Government Database.

**Request Body:**
```json
{
  "rfid": "RFID001234",
  "roll_no": "ROLL2024001",
  "dob": "2002-04-15"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "verified": true,
  "message": "Credentials verified successfully",
  "candidate": {
    "id": 1,
    "name": "Nikunj Agarwal",
    "roll_no": "ROLL2024001",
    "rfid": "RFID001234"
  }
}
```

**Failure Response (404):**
```json
{
  "success": false,
  "verified": false,
  "message": "Invalid credentials. Candidate not found in NIC database."
}
```

### 2. Face Verification

**POST** `/interview/verify-face`

Verifies live captured image against reference passport photo using face_verification_api.

**Request (multipart/form-data):**
- `rfid`: "RFID001234"
- `roll_no`: "ROLL2024001"
- `live_image`: [File] (JPEG/PNG)

**Success Response (200):**
```json
{
  "success": true,
  "verified": true,
  "match": true,
  "confidence": 95.67,
  "message": "Face verification successful",
  "candidate": {
    "name": "Nikunj Agarwal",
    "roll_no": "ROLL2024001"
  }
}
```

**Failure Response (200):**
```json
{
  "success": true,
  "verified": false,
  "match": false,
  "confidence": 45.23,
  "message": "Face verification failed",
  "candidate": {
    "name": "Nikunj Agarwal",
    "roll_no": "ROLL2024001"
  }
}
```

### 3. Get Candidate Details (Testing)

**GET** `/interview/candidate/:rfid`

Returns candidate details for testing.

**Example:** `GET /interview/candidate/RFID001234`

**Response:**
```json
{
  "id": 1,
  "rfid": "RFID001234",
  "roll_no": "ROLL2024001",
  "name": "Nikunj Agarwal",
  "dob": "2002-04-15",
  "reference_image_path": "uploads/candidates/nikunj_ref.jpg"
}
```

## 🔄 Complete Flow

### Frontend Flow:

1. **Step 1: Credentials Entry**
   ```javascript
   // User enters RFID, Roll No, DOB
   const loginResponse = await fetch('http://localhost:9091/interview/interview-login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       rfid: 'RFID001234',
       roll_no: 'ROLL2024001',
       dob: '2002-04-15'
     })
   });
   
   const loginData = await loginResponse.json();
   
   if (loginData.verified) {
     // Proceed to face verification
   }
   ```

2. **Step 2: Capture Live Image**
   ```javascript
   // Capture image from webcam
   const blob = await captureImageFromWebcam();
   
   const formData = new FormData();
   formData.append('rfid', 'RFID001234');
   formData.append('roll_no', 'ROLL2024001');
   formData.append('live_image', blob, 'live_capture.jpg');
   
   const faceResponse = await fetch('http://localhost:9091/interview/verify-face', {
     method: 'POST',
     body: formData
   });
   
   const faceData = await faceResponse.json();
   
   if (faceData.verified) {
     // Grant interview access
     console.log(`Face match: ${faceData.confidence}%`);
   } else {
     // Deny access
   }
   ```

## 🔌 Face Verification API Integration

The system calls your existing `face_verification_api` service:

**Endpoint:** `http://localhost:5000/verify`

**Request:**
- `image1`: Reference passport image from database
- `image2`: Live captured image

**Expected Response:**
```json
{
  "match": true,
  "confidence": 95.67
}
```

## 📊 Dummy NIC Government Database

| RFID | Roll No | Name | DOB | Reference Image |
|------|---------|------|-----|-----------------|
| RFID001234 | ROLL2024001 | Nikunj Agarwal | 2002-04-15 | nikunj_ref.jpg |
| RFID001235 | ROLL2024002 | Shreya Sharma | 2003-11-22 | shreya_ref.jpg |
| RFID001236 | ROLL2024003 | Rahul Kumar | 2002-08-10 | rahul_ref.jpg |
| RFID001237 | ROLL2024004 | Priya Singh | 2003-02-28 | priya_ref.jpg |
| RFID001238 | ROLL2024005 | Amit Verma | 2002-12-05 | amit_ref.jpg |

## 🧪 Testing with Postman

### Test 1: Interview Login
```
POST http://localhost:9091/interview/interview-login
Content-Type: application/json

{
  "rfid": "RFID001234",
  "roll_no": "ROLL2024001",
  "dob": "2002-04-15"
}
```

### Test 2: Face Verification
```
POST http://localhost:9091/interview/verify-face
Content-Type: multipart/form-data

rfid: RFID001234
roll_no: ROLL2024001
live_image: [Select image file]
```

## 🛡️ Security Features

- ✅ Multi-factor verification (RFID + Roll No + DOB)
- ✅ Face biometric verification
- ✅ Verification attempt logging
- ✅ IP address tracking
- ✅ File upload validation (5MB limit, JPEG/PNG only)
- ✅ Automatic cleanup on errors

## 📝 Verification Logs

All verification attempts are logged in `interview_verifications` table:
- Timestamp
- Credentials verification status
- Face verification status
- Confidence score
- IP address
- Image paths

## ⚙️ Configuration

Make sure your face verification API is running:
```bash
cd face_verification_api
python face_verification.py
# Should be running on http://localhost:5000
```

## 🚨 Troubleshooting

### Reference image not found
- Ensure images are in `uploads/candidates/` directory
- Check filenames match database records exactly

### Face API timeout
- Verify face_verification_api is running on port 5000
- Check API response format matches expected `{match, confidence}`

### File upload errors
- Max file size: 5MB
- Allowed formats: JPEG, PNG only
- Check file permissions on uploads directory

## 📦 Installation

```bash
npm install axios multer form-data
```

Already added to package.json! ✅
