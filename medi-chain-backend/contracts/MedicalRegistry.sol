// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MedicalRegistry
 * @dev Stores references to medical records on IPFS and manages access control
 */
contract MedicalRegistry {
    // Struct to store record metadata
    struct Record {
        string cid;           // IPFS content identifier
        uint256 timestamp;    // When the record was created
        address provider;     // Healthcare provider who created the record
        uint256 version;      // Version number for tracking updates
        bool exists;          // Flag to check if record exists
    }
    
    // Struct for access requests
    struct AccessRequest {
        address doctor;                          // Doctor requesting access
        address patient;                         // Patient whose records are requested
        bytes32[] requestedRecords;              // Specific record IDs requested
        string reason;                           // Reason for access request
        uint256 requestedDuration;               // Duration in seconds
        uint256 timestamp;                       // When request was made
        bool approved;                           // Whether request is approved
        bool exists;                             // Flag to check if request exists
    }
    
    // Struct for approved access with expiration
    struct ApprovedAccess {
        bytes32[] authorizedRecords;             // Which records can be accessed
        uint256 expiresAt;                       // Timestamp when access expires
        string sharedDataCid;                    // IPFS CID of re-encrypted data for this doctor
        bool exists;                             // Flag to check if access exists
    }
    
    // Struct to store patient data
    struct Patient {
        mapping(bytes32 => Record) records;      // recordId => Record
        mapping(address => bool) authorizedProviders;  // provider address => authorization status (legacy)
        mapping(address => ApprovedAccess) doctorAccess;  // doctor => approved access details
        bytes32[] recordIds;                     // List of record IDs for this patient
        bool exists;                             // Flag to check if patient exists
        string emergencyDataCid;                 // IPFS CID for emergency data
        bool allowEmergencyAccess;               // Whether emergency access is allowed
    }
    
    // Main storage - patient address to Patient struct
    mapping(address => Patient) private patients;
    
    // Access requests storage - requestId => AccessRequest
    mapping(bytes32 => AccessRequest) private accessRequests;
    
    // Mapping to track pending requests per patient
    mapping(address => bytes32[]) private patientPendingRequests;
    
    // List of all patients for enumeration
    address[] private patientList;
    
    // Events
    event RecordAdded(address indexed patient, bytes32 indexed recordId, string cid, address provider);
    event RecordUpdated(address indexed patient, bytes32 indexed recordId, string newCid, uint256 newVersion);
    event AccessGranted(address indexed patient, address indexed provider);
    event AccessRevoked(address indexed patient, address indexed provider);
    event EmergencyAccessUsed(address indexed patient, address indexed provider);
    event EmergencyDataUpdated(address indexed patient, string cid);
    event PatientRegistered(address indexed patient);
    
    // New events for doctor access requests
    event AccessRequested(bytes32 indexed requestId, address indexed doctor, address indexed patient, uint256 duration);
    event AccessApproved(bytes32 indexed requestId, address indexed doctor, address indexed patient, string sharedDataCid);
    event AccessDenied(bytes32 indexed requestId, address indexed doctor, address indexed patient);
    event AccessExpired(address indexed doctor, address indexed patient);
    
    // Modifiers
    modifier onlyPatient(address patientAddress) {
        require(msg.sender == patientAddress, "Only the patient can perform this action");
        _;
    }
    
    modifier onlyAuthorizedProvider(address patientAddress) {
        require(
            patients[patientAddress].authorizedProviders[msg.sender] || 
            msg.sender == patientAddress ||
            (patients[patientAddress].doctorAccess[msg.sender].exists && 
             patients[patientAddress].doctorAccess[msg.sender].expiresAt > block.timestamp),
            "Provider not authorized"
        );
        _;
    }
    
    modifier patientExists(address patientAddress) {
        require(patients[patientAddress].exists, "Patient does not exist");
        _;
    }
    
    // Register a new patient
    function registerPatient() external {
        require(!patients[msg.sender].exists, "Patient already registered");
        
        patients[msg.sender].exists = true;
        patients[msg.sender].allowEmergencyAccess = true; // Default to allowing emergency access
        patientList.push(msg.sender);
        
        emit PatientRegistered(msg.sender);
    }
    
    // Add a new medical record
    function addRecord(
        address patientAddress,
        bytes32 recordId,
        string calldata cid,
        uint256 timestamp
    ) external onlyAuthorizedProvider(patientAddress) patientExists(patientAddress) {
        require(!patients[patientAddress].records[recordId].exists, "Record already exists");
        
        Record memory newRecord = Record({
            cid: cid,
            timestamp: timestamp,
            provider: msg.sender,
            version: 1,
            exists: true
        });
        
        patients[patientAddress].records[recordId] = newRecord;
        patients[patientAddress].recordIds.push(recordId);
        
        emit RecordAdded(patientAddress, recordId, cid, msg.sender);
    }
    
    // Update an existing medical record
    function updateRecord(
        address patientAddress,
        bytes32 recordId,
        string calldata newCid
    ) external onlyAuthorizedProvider(patientAddress) patientExists(patientAddress) {
        Record storage record = patients[patientAddress].records[recordId];
        require(record.exists, "Record does not exist");
        
        // Only the original provider or the patient can update the record
        require(
            record.provider == msg.sender || patientAddress == msg.sender,
            "Not authorized to update this record"
        );
        
        record.cid = newCid;
        record.timestamp = block.timestamp;
        record.version += 1;
        
        emit RecordUpdated(patientAddress, recordId, newCid, record.version);
    }
    
    // Grant access to a provider
    function grantAccess(address provider) external {
        if (!patients[msg.sender].exists) {
            // Auto-register if not registered
            patients[msg.sender].exists = true;
            patients[msg.sender].allowEmergencyAccess = true; // Default to allowing emergency access
            patientList.push(msg.sender);
            
            emit PatientRegistered(msg.sender);
        }
        
        patients[msg.sender].authorizedProviders[provider] = true;
        emit AccessGranted(msg.sender, provider);
    }
    
    // Revoke access from a provider
    function revokeAccess(address provider) external onlyPatient(msg.sender) {
        patients[msg.sender].authorizedProviders[provider] = false;
        emit AccessRevoked(msg.sender, provider);
    }
    
    // Check if a provider has access to a patient's records
    function hasAccess(address patientAddress, address provider) external view returns (bool) {
        return patients[patientAddress].authorizedProviders[provider];
    }
    
    // Get a specific record (only authorized providers or the patient)
    function getRecord(address patientAddress, bytes32 recordId) 
        external 
        view 
        onlyAuthorizedProvider(patientAddress) 
        returns (string memory cid, uint256 timestamp, address provider, uint256 version) 
    {
        Record storage record = patients[patientAddress].records[recordId];
        require(record.exists, "Record does not exist");
        
        return (record.cid, record.timestamp, record.provider, record.version);
    }
    
    // Get all record IDs for a patient (only authorized providers or the patient)
    function getRecordIds(address patientAddress) 
        external 
        view 
        onlyAuthorizedProvider(patientAddress) 
        returns (bytes32[] memory) 
    {
        return patients[patientAddress].recordIds;
    }
    
    // Update emergency data CID
    function updateEmergencyData(string calldata cid) external {
        if (!patients[msg.sender].exists) {
            // Auto-register if not registered
            patients[msg.sender].exists = true;
            patients[msg.sender].allowEmergencyAccess = true;
            patientList.push(msg.sender);
            
            emit PatientRegistered(msg.sender);
        }
        
        patients[msg.sender].emergencyDataCid = cid;
        emit EmergencyDataUpdated(msg.sender, cid);
    }
    
    // Get emergency data CID
    function getEmergencyDataCid(address patientAddress) external view returns (string memory) {
        // Only the patient or a provider with emergency access can view this
        require(
            msg.sender == patientAddress || 
            (patients[patientAddress].allowEmergencyAccess && patients[patientAddress].authorizedProviders[msg.sender]),
            "Not authorized to access emergency data"
        );
        
        return patients[patientAddress].emergencyDataCid;
    }
    
    // Set emergency access flag
    function setEmergencyAccess(bool allow) external {
        if (!patients[msg.sender].exists) {
            // Auto-register if not registered
            patients[msg.sender].exists = true;
            patientList.push(msg.sender);
            
            emit PatientRegistered(msg.sender);
        }
        
        patients[msg.sender].allowEmergencyAccess = allow;
    }
    
    // Check if emergency access is allowed
    function isEmergencyAccessAllowed(address patientAddress) external view returns (bool) {
        return patients[patientAddress].allowEmergencyAccess;
    }
    
    // Emergency access function - to be expanded with proper verification
    function emergencyAccess(address patientAddress) external {
        require(patients[patientAddress].allowEmergencyAccess, "Emergency access not allowed by patient");
        
        // In a real implementation, this would include verification mechanisms
        // For now, we'll just grant temporary access and emit an event
        
        // Grant temporary access
        patients[patientAddress].authorizedProviders[msg.sender] = true;
        
        emit EmergencyAccessUsed(patientAddress, msg.sender);
        
        // In a real implementation, this would set up a timer to revoke access
        // or require additional verification after the fact
    }
    
    // Request access to patient records
    function requestAccess(
        address patientAddress,
        bytes32[] calldata requestedRecords,
        string calldata reason,
        uint256 durationInDays
    ) external returns (bytes32 requestId) {
        require(patientAddress != msg.sender, "Cannot request access to your own records");
        require(patients[patientAddress].exists, "Patient does not exist");
        require(requestedRecords.length > 0, "Must request at least one record");
        require(durationInDays > 0 && durationInDays <= 365, "Duration must be between 1 and 365 days");
        
        // Generate unique request ID
        requestId = keccak256(abi.encodePacked(msg.sender, patientAddress, block.timestamp, requestedRecords));
        require(!accessRequests[requestId].exists, "Request already exists");
        
        // Convert days to seconds
        uint256 durationInSeconds = durationInDays * 24 * 60 * 60;
        
        // Create access request
        accessRequests[requestId] = AccessRequest({
            doctor: msg.sender,
            patient: patientAddress,
            requestedRecords: requestedRecords,
            reason: reason,
            requestedDuration: durationInSeconds,
            timestamp: block.timestamp,
            approved: false,
            exists: true
        });
        
        // Add to patient's pending requests
        patientPendingRequests[patientAddress].push(requestId);
        
        emit AccessRequested(requestId, msg.sender, patientAddress, durationInSeconds);
        
        return requestId;
    }
    
    // Approve access request (only patient can do this)
    function approveAccess(
        bytes32 requestId,
        bytes32[] calldata approvedRecords,
        string calldata sharedDataCid
    ) external {
        AccessRequest storage request = accessRequests[requestId];
        require(request.exists, "Request does not exist");
        require(request.patient == msg.sender, "Only patient can approve access");
        require(!request.approved, "Request already processed");
        require(approvedRecords.length > 0, "Must approve at least one record");
        
        // Mark request as approved
        request.approved = true;
        
        // Set up time-limited access
        uint256 expiresAt = block.timestamp + request.requestedDuration;
        
        patients[msg.sender].doctorAccess[request.doctor] = ApprovedAccess({
            authorizedRecords: approvedRecords,
            expiresAt: expiresAt,
            sharedDataCid: sharedDataCid,
            exists: true
        });
        
        // Remove from pending requests
        _removePendingRequest(msg.sender, requestId);
        
        emit AccessApproved(requestId, request.doctor, msg.sender, sharedDataCid);
    }
    
    // Deny access request (only patient can do this)
    function denyAccess(bytes32 requestId) external {
        AccessRequest storage request = accessRequests[requestId];
        require(request.exists, "Request does not exist");
        require(request.patient == msg.sender, "Only patient can deny access");
        require(!request.approved, "Request already processed");
        
        // Remove from pending requests
        _removePendingRequest(msg.sender, requestId);
        
        emit AccessDenied(requestId, request.doctor, msg.sender);
        
        // Clean up request
        delete accessRequests[requestId];
    }
    
    // Revoke doctor access (patient can revoke anytime)
    function revokeDoctorAccess(address doctor) external {
        require(patients[msg.sender].doctorAccess[doctor].exists, "No active access for this doctor");
        
        delete patients[msg.sender].doctorAccess[doctor];
        
        emit AccessExpired(doctor, msg.sender);
    }
    
    // Get access request details
    function getAccessRequest(bytes32 requestId) external view returns (
        address doctor,
        address patient,
        bytes32[] memory requestedRecords,
        string memory reason,
        uint256 requestedDuration,
        uint256 timestamp,
        bool approved
    ) {
        AccessRequest storage request = accessRequests[requestId];
        require(request.exists, "Request does not exist");
        require(request.patient == msg.sender || request.doctor == msg.sender, "Not authorized to view this request");
        
        return (
            request.doctor,
            request.patient,
            request.requestedRecords,
            request.reason,
            request.requestedDuration,
            request.timestamp,
            request.approved
        );
    }
    
    // Get pending access requests for a patient
    function getPendingRequests(address patientAddress) external view returns (bytes32[] memory) {
        require(patientAddress == msg.sender, "Can only view your own pending requests");
        return patientPendingRequests[patientAddress];
    }
    
    // Get doctor access details
    function getDoctorAccess(address patientAddress, address doctor) external view returns (
        bytes32[] memory authorizedRecords,
        uint256 expiresAt,
        string memory sharedDataCid,
        bool exists
    ) {
        require(
            patientAddress == msg.sender || doctor == msg.sender,
            "Not authorized to view access details"
        );
        
        ApprovedAccess storage access = patients[patientAddress].doctorAccess[doctor];
        
        return (
            access.authorizedRecords,
            access.expiresAt,
            access.sharedDataCid,
            access.exists && access.expiresAt > block.timestamp
        );
    }
    
    // Check if doctor has access to specific record
    function hasDoctorAccess(address patientAddress, address doctor, bytes32 recordId) external view returns (bool) {
        ApprovedAccess storage access = patients[patientAddress].doctorAccess[doctor];
        
        if (!access.exists || access.expiresAt <= block.timestamp) {
            return false;
        }
        
        // Check if recordId is in authorized records
        for (uint i = 0; i < access.authorizedRecords.length; i++) {
            if (access.authorizedRecords[i] == recordId) {
                return true;
            }
        }
        
        return false;
    }
    
    // Internal function to remove pending request
    function _removePendingRequest(address patientAddress, bytes32 requestId) internal {
        bytes32[] storage pending = patientPendingRequests[patientAddress];
        
        for (uint i = 0; i < pending.length; i++) {
            if (pending[i] == requestId) {
                // Move last element to current position and pop
                pending[i] = pending[pending.length - 1];
                pending.pop();
                break;
            }
        }
    }
    
    // Clean up expired access (can be called by anyone)
    function cleanupExpiredAccess(address patientAddress, address doctor) external {
        ApprovedAccess storage access = patients[patientAddress].doctorAccess[doctor];
        require(access.exists, "No access exists for this doctor");
        require(access.expiresAt <= block.timestamp, "Access has not expired yet");
        
        delete patients[patientAddress].doctorAccess[doctor];
        
        emit AccessExpired(doctor, patientAddress);
    }
} 