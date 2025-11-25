"""Service for interacting with Orthanc DICOM server."""
import io
import zipfile
from pathlib import Path
from typing import List, Tuple, Optional
import os

import httpx
try:
    import pydicom
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False

# Orthanc configuration
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USERNAME = os.getenv("ORTHANC_USERNAME", "orthanc")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "orthanc")

AUTH = (ORTHANC_USERNAME, ORTHANC_PASSWORD) if ORTHANC_USERNAME and ORTHANC_PASSWORD else None


async def upload_dicom_files_to_orthanc(
    files: List[bytes],
) -> Tuple[str, str]:
    """
    Uploads DICOM files (bytes) to Orthanc via REST.
    Returns (orthanc_study_id, study_instance_uid).
    """
    client_kwargs = {"timeout": 60.0}
    if AUTH:
        client_kwargs["auth"] = AUTH
    
    async with httpx.AsyncClient(**client_kwargs) as client:
        first_study_uid: Optional[str] = None
        orthanc_study_id: Optional[str] = None

        try:
            # First, extract StudyInstanceUID from the first DICOM file
            if PYDICOM_AVAILABLE and files:
                try:
                    ds = pydicom.dcmread(io.BytesIO(files[0]), stop_before_pixels=True)
                    if hasattr(ds, "StudyInstanceUID"):
                        first_study_uid = str(ds.StudyInstanceUID)
                        print(f"📋 Extracted StudyInstanceUID from first file: {first_study_uid}")
                except Exception as e:
                    print(f"Warning: Could not extract StudyInstanceUID from first file: {e}")
            
            # Upload all files to Orthanc
            first_instance_id: Optional[str] = None
            first_instance_response: Optional[dict] = None
            
            uploaded_instances = []
            for idx, content in enumerate(files):
                # POST to Orthanc
                print(f"📤 Uploading instance {idx + 1}/{len(files)} ({len(content)} bytes)...")
                r = await client.post(f"{ORTHANC_URL}/instances", content=content)
                r.raise_for_status()
                
                # Orthanc returns JSON with instance info
                try:
                    instance_response = r.json()
                    print(f"   Response: {instance_response}")
                except Exception:
                    # Fallback: try parsing as text (some Orthanc versions return plain string)
                    instance_id_str = r.text.strip().strip('"')
                    instance_response = {"ID": instance_id_str}
                    print(f"   Response (text): {instance_id_str}")
                
                # Handle different Orthanc response formats
                instance_id = None
                if "ID" in instance_response:
                    instance_id = instance_response["ID"]
                elif isinstance(instance_response, str):
                    instance_id = instance_response.strip().strip('"')
                
                if instance_id:
                    uploaded_instances.append(instance_id)
                    print(f"   ✅ Instance uploaded: {instance_id}")
                    
                    if first_instance_id is None:
                        first_instance_id = instance_id
                        first_instance_response = instance_response
                        
                        # Extract ParentStudy directly from first response if available
                        if "ParentStudy" in instance_response:
                            orthanc_study_id = instance_response["ParentStudy"]
                            print(f"📋 Got study ID from first upload response: {orthanc_study_id}")
                else:
                    print(f"   ⚠️  Unexpected response format: {instance_response}")
            
            print(f"📊 Total instances uploaded: {len(uploaded_instances)}")
            
            # Get study information from the first instance if we don't have it yet
            if first_instance_id and not orthanc_study_id:
                try:
                    instance_info = await client.get(f"{ORTHANC_URL}/instances/{first_instance_id}")
                    instance_info.raise_for_status()
                    instance_data = instance_info.json()
                    
                    # Get ParentStudy (the study ID in Orthanc)
                    orthanc_study_id = instance_data.get("ParentStudy")
                    
                    # If we don't have StudyInstanceUID yet, try to get it from instance
                    if not first_study_uid:
                        main_tags = instance_data.get("MainDicomTags", {})
                        first_study_uid = main_tags.get("StudyInstanceUID")
                        if first_study_uid:
                            print(f"📋 Got StudyInstanceUID from Orthanc instance: {first_study_uid}")
                    
                    print(f"📋 Got study ID from Orthanc instance query: {orthanc_study_id}")
                except Exception as e:
                    print(f"Warning: Could not get instance info from Orthanc: {e}")
                    import traceback
                    traceback.print_exc()
            
            # If we have study ID but not StudyInstanceUID, get it from the study endpoint
            if orthanc_study_id and not first_study_uid:
                try:
                    print(f"🔍 Getting StudyInstanceUID from study: {orthanc_study_id}")
                    study_info = await client.get(f"{ORTHANC_URL}/studies/{orthanc_study_id}")
                    study_info.raise_for_status()
                    study_data = study_info.json()
                    main_tags = study_data.get("MainDicomTags", {})
                    first_study_uid = main_tags.get("StudyInstanceUID")
                    if first_study_uid:
                        print(f"📋 Got StudyInstanceUID from Orthanc study: {first_study_uid}")
                    else:
                        print(f"⚠️ Study data: {study_data}")
                except Exception as e:
                    print(f"Warning: Could not get study info from Orthanc: {e}")
                    import traceback
                    traceback.print_exc()
            
            # If we still don't have study ID, try to find it by StudyInstanceUID
            if not orthanc_study_id and first_study_uid:
                try:
                    print(f"🔍 Searching for study by StudyInstanceUID: {first_study_uid}")
                    # Get all studies
                    studies_resp = await client.get(f"{ORTHANC_URL}/studies")
                    studies_resp.raise_for_status()
                    study_ids = studies_resp.json()
                    
                    # Find the study with matching StudyInstanceUID
                    for study_id in study_ids:
                        study_info = await client.get(f"{ORTHANC_URL}/studies/{study_id}")
                        study_info.raise_for_status()
                        study_data = study_info.json()
                        study_uid = study_data.get("MainDicomTags", {}).get("StudyInstanceUID")
                        if study_uid == first_study_uid:
                            orthanc_study_id = study_id
                            print(f"✅ Found study by StudyInstanceUID: {orthanc_study_id}")
                            break
                except Exception as e:
                    print(f"Warning: Could not search for study: {e}")
                    import traceback
                    traceback.print_exc()

            if not first_study_uid:
                raise ValueError("Could not determine StudyInstanceUID from uploaded files")
            
            if not orthanc_study_id:
                raise ValueError(f"Could not determine study ID from Orthanc. StudyInstanceUID: {first_study_uid}")

            # Verify the study has instances after upload
            # When instances are "AlreadyStored", Orthanc might need a moment to update
            # So we check both the study endpoint and query series directly
            try:
                import asyncio
                # Small delay to allow Orthanc to update study metadata
                await asyncio.sleep(0.5)
                
                study_info = await client.get(f"{ORTHANC_URL}/studies/{orthanc_study_id}")
                study_info.raise_for_status()
                study_data = study_info.json()
                
                # Get instance count from study endpoint
                instance_count_from_study = len(study_data.get("Instances", []))
                series_list = study_data.get("Series", [])
                series_count = len(series_list)
                
                # Also count instances by querying each series
                total_instances_from_series = 0
                if series_list:
                    for series_id in series_list[:3]:  # Check first 3 series as sample
                        try:
                            series_info = await client.get(f"{ORTHANC_URL}/series/{series_id}")
                            series_info.raise_for_status()
                            series_data = series_info.json()
                            total_instances_from_series += len(series_data.get("Instances", []))
                        except Exception:
                            pass
                
                print(f"📊 Study verification:")
                print(f"   Series: {series_count}")
                print(f"   Instances (from study endpoint): {instance_count_from_study}")
                if total_instances_from_series > 0:
                    print(f"   Instances (from series query, sample): {total_instances_from_series}+")
                
                # If instances are "AlreadyStored", they exist but might not be in study's instance list yet
                # Check if we have series, which means instances are associated
                if series_count > 0:
                    if instance_count_from_study == 0 and total_instances_from_series == 0:
                        print(f"   ⚠️  WARNING: Study has series but no instances visible.")
                        print(f"   This might be a timing issue. Instances marked as 'AlreadyStored' exist in Orthanc.")
                    elif instance_count_from_study > 0 or total_instances_from_series > 0:
                        print(f"   ✅ Study has instances - upload successful!")
                        print(f"   Note: Some instances were 'AlreadyStored' (already in Orthanc).")
                else:
                    print(f"   ⚠️  WARNING: Study has no series or instances!")
                    
            except Exception as e:
                print(f"   ⚠️  Could not verify study instances: {e}")
                import traceback
                traceback.print_exc()

            print(f"✅ Upload complete: study_id={orthanc_study_id}, study_uid={first_study_uid}")
            return orthanc_study_id, first_study_uid

        except httpx.HTTPStatusError as e:
            raise ValueError(f"Orthanc upload failed: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            raise ValueError(f"Failed to upload to Orthanc: {str(e)}")


def extract_files_from_upload(filename: str, raw_bytes: bytes) -> List[bytes]:
    """
    Accepts either a ZIP file or a single DICOM file.
    Returns a list of candidate DICOM file bytes.
    """
    if filename.lower().endswith(".zip"):
        out: List[bytes] = []
        try:
            with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
                for name in zf.namelist():
                    # skip folders
                    if name.endswith("/"):
                        continue
                    # only include likely DICOM files (no strict extension check)
                    if name.lower().endswith((".dcm", ".dicom", "")) or not "." in name:
                        try:
                            out.append(zf.read(name))
                        except Exception as e:
                            print(f"Warning: Could not read {name} from ZIP: {e}")
                            continue
        except zipfile.BadZipFile:
            raise ValueError("Invalid ZIP file")
        
        if not out:
            raise ValueError("No DICOM-like files found in ZIP")
        return out

    # Non-ZIP: assume it's either a single DICOM or some wrapper
    return [raw_bytes]

