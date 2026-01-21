# Quick Start Guide - Interview Login System

## ✅ What I've Created

### 1. Two New API Routes:
- **POST /interview/interview-login** - Verifies RFID + Roll No + DOB
- **POST /interview/verify-face** - Verifies live image vs reference image

### 2. Database Tables:
- `interview_candidates` - NIC Government Database (5 dummy candidates)
- `interview_verifications` - Logs all verification attempts

### 3. File Upload System:
- Reference images: `uploads/candidates/`
- Live captures: `uploads/live_captures/`

## 🚀 Setup Steps

### Step 1: Run Database Migration

Open MySQL Workbench → Execute this file:
```
d:\Task\niyuktisetu-nik\node-backend\database\interview_candidates.sql
```

This creates tables and inserts 5 dummy candidates.

### Step 2: Add Reference Images

Copy 5 passport-size photos to: `d:\Task\niyuktisetu-nik\node-backend\uploads\candidates\`

Name them:
- `nikunj_ref.jpg`
- `shreya_ref.jpg`
- `rahul_ref.jpg`
- `priya_ref.jpg`
- `amit_ref.jpg`

**For testing:** You can use the same photo 5 times with different names!

### Step 3: Start Face Verification API

```bash
cd d:\Task\niyuktisetu-nik\face_verification_api
python face_verification.py
```

Should run on: http://localhost:5000

### Step 4: Start Node Backend

```bash
cd d:\Task\niyuktisetu-nik\node-backend
npm start
```

Should run on: http://localhost:9091

## 🧪 Test the Flow

### Test 1: Interview Login (Postman)

```
POST http://localhost:9091/interview/interview-login
Content-Type: application/json

{
  "rfid": "RFID001234",
  "roll_no": "ROLL2024001",
  "dob": "2002-04-15"
}
```

✅ Expected Response:
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

### Test 2: Face Verification (Postman)

```
POST http://localhost:9091/interview/verify-face
Content-Type: multipart/form-data

Form Data:
- rfid: RFID001234
- roll_no: ROLL2024001
- live_image: [Upload a photo file]
```

✅ Expected Response:
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

## 📋 Available Test Candidates

| RFID | Roll No | Name | DOB |
|------|---------|------|-----|
| RFID001234 | ROLL2024001 | Nikunj Agarwal | 2002-04-15 |
| RFID001235 | ROLL2024002 | Shreya Sharma | 2003-11-22 |
| RFID001236 | ROLL2024003 | Rahul Kumar | 2002-08-10 |
| RFID001237 | ROLL2024004 | Priya Singh | 2003-02-28 |
| RFID001238 | ROLL2024005 | Amit Verma | 2002-12-05 |

## 🔄 Integration with Frontend

### Step 1: Credentials Check
```javascript
const loginResponse = await fetch('http://localhost:9091/interview/interview-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rfid, roll_no, dob })
});

const loginData = await loginResponse.json();

if (loginData.verified) {
  // Show camera for face capture
}
```

### Step 2: Face Verification
```javascript
// Capture from webcam
const blob = await captureImage();

const formData = new FormData();
formData.append('rfid', rfid);
formData.append('roll_no', roll_no);
formData.append('live_image', blob, 'live.jpg');

const faceResponse = await fetch('http://localhost:9091/interview/verify-face', {
  method: 'POST',
  body: formData
});

const faceData = await faceResponse.json();

if (faceData.verified && faceData.confidence > 80) {
  // Grant interview access
  console.log(`Match: ${faceData.confidence}%`);
} else {
  // Deny access
}
```

## 🎯 What Happens Behind the Scenes

1. **Interview Login:**
   - Receives RFID, Roll No, DOB
   - Queries `interview_candidates` table
   - If all 3 match → Returns `verified: true`
   - Logs attempt in `interview_verifications`

2. **Face Verification:**
   - Receives RFID, Roll No, Live Image
   - Finds candidate's reference image from database
   - Sends both images to face_verification_api
   - Gets `{match: true/false, confidence: 95.67}`
   - Returns `verified: true` if match is true
   - Logs result with confidence score

## 🛡️ Security Features

✅ All 3 credentials must match (RFID + Roll No + DOB)
✅ Reference image path stored securely in database
✅ File upload size limited to 5MB
✅ Only JPEG/PNG allowed
✅ All attempts logged with IP address
✅ Automatic file cleanup on errors

## 📝 Next Steps

1. ✅ Run database migration
2. ✅ Add reference images
3. ✅ Test with Postman
4. 🔄 Integrate with frontend React component
5. 🔄 Connect to node-gateway if needed

Complete documentation in: `INTERVIEW_API.md` 📚
