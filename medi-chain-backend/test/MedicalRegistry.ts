import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("MedicalRegistry", function () {
  let medicalRegistry: Contract;
  let owner: SignerWithAddress;
  let patient: SignerWithAddress;
  let provider: SignerWithAddress;
  let unauthorizedProvider: SignerWithAddress;
  
  // Sample record data
  const recordId = ethers.utils.id("record1");
  const cid = "QmWmyoMoctfbAaiEs2G46gpeUmhqFRDW6KWo64y5r581Vz";
  const updatedCid = "QmNewCid123456789";
  
  beforeEach(async function () {
    // Get signers
    [owner, patient, provider, unauthorizedProvider] = await ethers.getSigners();
    
    // Deploy the contract
    const MedicalRegistry = await ethers.getContractFactory("MedicalRegistry");
    medicalRegistry = await MedicalRegistry.deploy();
    await medicalRegistry.deployed();
    
    // Register patient
    await medicalRegistry.connect(patient).registerPatient();
    
    // Grant access to provider
    await medicalRegistry.connect(patient).grantAccess(provider.address);
  });
  
  describe("Patient Registration", function () {
    it("Should register a new patient", async function () {
      const newPatient = owner; // Using owner as a new patient for this test
      await medicalRegistry.connect(newPatient).registerPatient();
      
      // Verify registration was successful by checking if we can grant access
      // This is an indirect way to verify registration worked
      await expect(medicalRegistry.connect(newPatient).grantAccess(unauthorizedProvider.address))
        .to.not.be.reverted;
    });
    
    it("Should not allow registering the same patient twice", async function () {
      await expect(
        medicalRegistry.connect(patient).registerPatient()
      ).to.be.revertedWith("Patient already registered");
    });
  });
  
  describe("Access Control", function () {
    it("Should grant access to a provider", async function () {
      const hasAccess = await medicalRegistry.hasAccess(patient.address, provider.address);
      expect(hasAccess).to.be.true;
    });
    
    it("Should revoke access from a provider", async function () {
      await medicalRegistry.connect(patient).revokeAccess(provider.address);
      const hasAccess = await medicalRegistry.hasAccess(patient.address, provider.address);
      expect(hasAccess).to.be.false;
    });
    
    it("Should not allow unauthorized providers to access records", async function () {
      await expect(
        medicalRegistry.connect(unauthorizedProvider).getRecordIds(patient.address)
      ).to.be.revertedWith("Provider not authorized");
    });
  });
  
  describe("Record Management", function () {
    it("Should allow a provider to add a record", async function () {
      await medicalRegistry.connect(provider).addRecord(patient.address, recordId, cid);
      
      const [recordCid, , recordProvider, version] = await medicalRegistry.connect(provider).getRecord(patient.address, recordId);
      expect(recordCid).to.equal(cid);
      expect(recordProvider).to.equal(provider.address);
      expect(version).to.equal(1);
    });
    
    it("Should allow a provider to update a record", async function () {
      await medicalRegistry.connect(provider).addRecord(patient.address, recordId, cid);
      await medicalRegistry.connect(provider).updateRecord(patient.address, recordId, updatedCid);
      
      const [recordCid, , , version] = await medicalRegistry.connect(provider).getRecord(patient.address, recordId);
      expect(recordCid).to.equal(updatedCid);
      expect(version).to.equal(2);
    });
    
    it("Should allow a patient to access their own records", async function () {
      await medicalRegistry.connect(provider).addRecord(patient.address, recordId, cid);
      
      const recordIds = await medicalRegistry.connect(patient).getRecordIds(patient.address);
      expect(recordIds.length).to.equal(1);
      expect(recordIds[0]).to.equal(recordId);
      
      const [recordCid] = await medicalRegistry.connect(patient).getRecord(patient.address, recordId);
      expect(recordCid).to.equal(cid);
    });
    
    it("Should not allow adding a record that already exists", async function () {
      await medicalRegistry.connect(provider).addRecord(patient.address, recordId, cid);
      
      await expect(
        medicalRegistry.connect(provider).addRecord(patient.address, recordId, cid)
      ).to.be.revertedWith("Record already exists");
    });
  });
  
  describe("Emergency Access", function () {
    it("Should grant emergency access to a provider", async function () {
      await medicalRegistry.connect(unauthorizedProvider).emergencyAccess(patient.address);
      
      const hasAccess = await medicalRegistry.hasAccess(patient.address, unauthorizedProvider.address);
      expect(hasAccess).to.be.true;
    });
  });
}); 