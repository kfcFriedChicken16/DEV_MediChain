# 🚨 Emergency Access System Guide

## Overview

The MediChain Emergency Access System allows healthcare providers to access critical patient information in emergency situations when the patient is unable to provide their private key.

## How It Works

### 🔐 Dual Encryption System

When a patient saves their emergency data, the system creates **two encrypted copies**:

1. **Regular Copy** - Encrypted with patient's wallet address (only patient can decrypt)
2. **Emergency Copy** - Encrypted with emergency key derived from patient's address + known salt

### 🔑 Emergency Key Derivation

```
Emergency Key = generateKeyFromPassword(patientAddress + "MEDICHAIN_EMERGENCY_ACCESS_2024")
```

This means:
- ✅ **Deterministic** - Same patient address always produces same emergency key
- ✅ **No private keys needed** - Only patient's public address required
- ✅ **Secure** - Emergency key is different from patient's regular key

## For Patients

### Setting Up Emergency Access

1. Go to **Emergency Settings** page (`/emergency`)
2. Fill in your emergency information:
   - Blood type
   - Allergies
   - Current medications
   - Emergency contacts
   - Medical alerts (DNR, organ donor status)
3. Click **Save Emergency Information**
4. The system will display your **Emergency Access Information**:
   - Your Ethereum address
   - Emergency Data CID

### Sharing Emergency Information

**Option 1: Medical Alert Bracelet**
```
Patient Address: 0x1234...
Emergency CID: QmX7y9z...
```

**Option 2: Share with Emergency Contacts**
- Give them your address and emergency CID
- They can provide this to healthcare providers

**Option 3: Digital Wallet**
- Store the information in your digital wallet
- Accessible via QR code or NFC

## For Healthcare Providers

### Emergency Access Process

1. Go to **Emergency Access** page (`/emergency-access`)
2. Enter the patient's information:
   - **Patient Ethereum Address** (e.g., `0x1234...`)
   - **Emergency Data CID** (e.g., `QmX7y9z...`)
3. Click **Access Emergency Data**
4. View critical patient information:
   - Blood type
   - Allergies
   - Current medications
   - Emergency contacts
   - Medical alerts

### What Information is Available

The emergency access provides **critical information only**:

✅ **Available:**
- Blood type
- Allergies
- Current medications
- Chronic conditions
- Emergency notes
- Emergency contacts
- Organ donor status
- DNR orders

❌ **Not Available:**
- Full medical history
- Detailed records
- Personal information beyond emergency needs

## Security Features

### 🔒 Access Control
- Only healthcare providers can access emergency data
- All access attempts are logged
- Emergency access is clearly marked

### 📊 Audit Trail
- Every emergency access is recorded
- Includes provider address and timestamp
- Patient can review access logs

### 🛡️ Data Protection
- Emergency data is encrypted
- Only essential information is accessible
- No private keys required for emergency access

## Real-World Usage Example

### Scenario: Unconscious Patient

1. **Patient arrives unconscious** at emergency room
2. **Medical alert bracelet** shows:
   ```
   Patient: 0x1234...
   Emergency CID: QmX7y9z...
   ```
3. **Doctor enters information** at `/emergency-access`
4. **Immediate access** to:
   - Blood type: O+
   - Allergies: Penicillin, Peanuts
   - Current meds: Metformin
   - Emergency contact: John Doe (555-123-4567)
5. **Life-saving treatment** can begin immediately

## Technical Implementation

### Key Functions

```typescript
// Create emergency-accessible data
createEmergencyAccessibleData(data, patientAddress)

// Access emergency data (for providers)
fetchEmergencyAccessibleData(emergencyCid, patientAddress)

// Upload emergency data (creates both copies)
uploadEmergencyData(data, patientAddress) // Returns { regularCid, emergencyCid }
```

### Emergency Salt
```typescript
const emergencySalt = 'MEDICHAIN_EMERGENCY_ACCESS_2024';
```

**Note:** In production, this would be more secure and potentially configurable.

## Best Practices

### For Patients
- ✅ Keep emergency information updated
- ✅ Share emergency access info with trusted contacts
- ✅ Wear medical alert jewelry with your information
- ✅ Test emergency access periodically

### For Healthcare Providers
- ✅ Use emergency access only in true emergencies
- ✅ Document all emergency access attempts
- ✅ Respect patient privacy and data limits
- ✅ Follow institutional emergency protocols

## Troubleshooting

### Common Issues

**"Failed to access emergency data"**
- Verify patient address is correct
- Check emergency CID is valid
- Ensure patient has saved emergency data

**"No emergency data found"**
- Patient may not have set up emergency access
- Emergency data may not be saved yet
- Check if patient address is correct

### Support

For technical support or questions about emergency access:
- Check the application logs
- Verify network connectivity
- Contact system administrator

---

**🚨 Remember: Emergency access is for life-threatening situations only. All access is logged and monitored.** 