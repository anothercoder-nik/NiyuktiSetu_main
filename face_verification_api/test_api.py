import requests

# Test Face Verification API
print("Testing Face Verification API...")
print("=" * 50)

# 1. Health Check
print("\n1. Health Check:")
try:
    response = requests.get('http://localhost:5000/health')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
    print("Make sure the Face API is running: python app.py")

print("\n" + "=" * 50)
print("\nTo test face verification:")
print("POST http://localhost:5000/verify")
print("Form Data:")
print("  - image1: reference image file")
print("  - image2: live capture image file")
print("\nExpected Response:")
print("  {")
print('    "match": true/false,')
print('    "confidence": 95.67')
print("  }")
