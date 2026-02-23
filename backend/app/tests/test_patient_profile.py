#!/usr/bin/env python3
"""
Test the patient profile endpoint.
"""
import requests
import json

def test_patient_profile():
    """Test the patient profile endpoint."""
    
    try:
        print("🔐 Testing patient login...")
        # First login as a patient to get token
        login_response = requests.post('http://localhost:8000/api/v1/patient/auth/login', 
                                     headers={'Content-Type': 'application/json'},
                                     json={'username_or_email': 'patient@example.com', 'password': 'Patient123!'},
                                     timeout=10)
        
        if login_response.status_code != 200:
            print(f"❌ Patient login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
        
        login_data = login_response.json()
        token = login_data['access_token']
        print("✅ Patient login successful!")
        
        # Test patient profile endpoint
        print("\n👤 Testing /api/v1/patient/profile...")
        profile_response = requests.get('http://localhost:8000/api/v1/patient/profile',
                                      headers={'Authorization': f'Bearer {token}'},
                                      timeout=10)
        
        print(f"Profile Status: {profile_response.status_code}")
        if profile_response.status_code == 200:
            profile_data = profile_response.json()
            print(f"✅ Patient profile endpoint working!")
            
            # Check response structure
            if 'data' in profile_data:
                data = profile_data['data']
                print(f"\n📊 Profile Data Structure:")
                print(f"  - Has 'data' key: True")
                print(f"  - Data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                
                if isinstance(data, dict):
                    print(f"\n👤 Patient Profile Details:")
                    print(f"  - ID: {data.get('id', 'N/A')}")
                    print(f"  - Name: {data.get('firstName', 'N/A')} {data.get('lastName', 'N/A')}")
                    print(f"  - Email: {data.get('email', 'N/A')}")
                    print(f"  - Phone: {data.get('phone', 'N/A')}")
                    print(f"  - Gender: {data.get('gender', 'N/A')}")
                    print(f"  - Date of Birth: {data.get('dateOfBirth', 'N/A')}")
                    print(f"  - Height: {data.get('height', 'N/A')}")
                    print(f"  - Weight: {data.get('weight', 'N/A')}")
                    print(f"  - BMI: {data.get('bmi', 'N/A')}")
                    print(f"  - Blood Group: {data.get('bloodGroup', 'N/A')}")
                    
                    # Check vitals
                    vitals = data.get('vitals', [])
                    print(f"  - Vitals count: {len(vitals) if isinstance(vitals, list) else 'Not a list'}")
                    
                    # Check medical history
                    medical_history = data.get('medicalHistory', [])
                    print(f"  - Medical history count: {len(medical_history) if isinstance(medical_history, list) else 'Not a list'}")
                    
                    # Check immunizations
                    immunizations = data.get('immunizations', [])
                    print(f"  - Immunizations count: {len(immunizations) if isinstance(immunizations, list) else 'Not a list'}")
            else:
                print(f"  - Direct response: {profile_data}")
        else:
            print(f"❌ Patient profile endpoint failed: {profile_response.text}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing patient profile endpoint...")
    success = test_patient_profile()
    if success:
        print("\n🎉 Patient profile endpoint is working!")
    else:
        print("\n❌ Test failed!")
