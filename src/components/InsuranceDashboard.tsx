/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileCheck, Shield, Clipboard, Search, CheckCircle, XCircle, 
  User, Calendar, Info, Clock, AlertTriangle, ExternalLink, HelpCircle,
  ShieldCheck, FileText, Edit3, X, ClipboardCheck, Edit2, TrendingUp, BarChart3, Database, Sliders, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Claim, User as UserType } from '../types';

interface InsuranceDashboardProps {
  insuranceUser: UserType;
  patients: UserType[];
  claims: Claim[];
  onUpdateClaimStatus: (claimId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  onUpdateUserProfile?: (userId: string, updatedFields: Partial<UserType>) => void;
  insuranceRequests?: any[];
  insurancePolicies?: Record<string, any>;
  onSaveInsuranceRequests?: (requests: any[]) => Promise<void>;
  onUpdateInsurancePolicy?: (patientId: string, policy: any) => Promise<void>;
}

export default function InsuranceDashboard({
  insuranceUser,
  patients,
  claims,
  onUpdateClaimStatus,
  activeSection,
  onSectionChange,
  onLogout,
  onUpdateUserProfile,
  insuranceRequests: propsInsuranceRequests,
  insurancePolicies: propsInsurancePolicies,
  onSaveInsuranceRequests,
  onUpdateInsurancePolicy
}: InsuranceDashboardProps) {

  // Interactive feedback
  const [feedback, setFeedback] = useState('');

  // Searches/Filters
  const [claimSearch, setClaimSearch] = useState('');
  const [eligibilitySearch, setEligibilitySearch] = useState('');
  const [activeClaimFilter, setActiveClaimFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Load and manage dynamic patient insurance update requests
  const [requests, setRequests] = useState<{
    id: string;
    patientId: string;
    patientName: string;
    patientMedicalId: string;
    type: string;
    desc: string;
    docName?: string;
    date: string;
    status: 'Pending Review' | 'Approved' | 'Rejected' | 'Requires More Information';
    statusExplanation?: string;
  }[]>(() => {
    if (propsInsuranceRequests && propsInsuranceRequests.length > 0) return propsInsuranceRequests;
    return [];
  });

  // Synchronize dynamic requests with Props (strictly Firestore-only)
  useEffect(() => {
    if (propsInsuranceRequests) {
      setRequests(propsInsuranceRequests);
    }
  }, [propsInsuranceRequests]);

  // Sync with Firestore database
  const saveRequests = (newRequests: typeof requests) => {
    setRequests(newRequests);
    if (onSaveInsuranceRequests) {
      onSaveInsuranceRequests(newRequests).catch(err => {
        alert("Verification Update Sync Alert: Failed to write review updates securely to Firestore. Detail: " + err);
      });
    }
  };

  // Eligibility Lookup Matching
  const matchedEligibility = useMemo(() => {
    const q = eligibilitySearch.toLowerCase().trim();
    if (!q) return null;
    return patients.find(p => 
      (p.fullName || '').toLowerCase().includes(q) || 
      (p.medicalId && p.medicalId.toLowerCase().includes(q)) ||
      (p.nationalId && p.nationalId.includes(q))
    );
  }, [patients, eligibilitySearch]);

  const handleClaimReviewAction = (claimId: string, action: 'APPROVED' | 'REJECTED') => {
    const notesSuggestion = action === 'APPROVED' 
      ? 'Approved in adherence to verified plan service coverage limits.' 
      : 'Denied. Claim exceeds contract coverages and authorized service bounds.';
    onUpdateClaimStatus(claimId, action, notesSuggestion);
    setFeedback(`Claim #${claimId.substring(claimId.length - 4)} successfully ${action === 'APPROVED' ? 'Approved' : 'Declined'}`);
    setTimeout(() => setFeedback(''), 3500);
  };

  // Merge real pending verifications with a realistic seed
  const pendingVerifications = useMemo(() => {
    const realPending = patients.map(p => {
      const policy = propsInsurancePolicies ? propsInsurancePolicies[p.id] : null;
      return {
        id: `verif-${p.id}`,
        patientId: p.id,
        patientName: p.fullName,
        patientMedicalId: p.medicalId || 'MID-UNKNOWN',
        provider: policy?.provider || p.insuranceCompany || 'N Nile Health Insurance',
        policyNumber: policy?.policyNumber || p.employeeId || 'PL-Pending',
        submissionDate: policy?.submissionDate || 'June 14, 2026',
        cardFile: policy?.cardFile || 'insurance_card.png',
        status: policy?.status || 'Pending Verification',
        isReal: true
      };
    }).filter(item => item.status === 'Pending Verification' && item.provider !== 'No Insurance');

    return realPending;
  }, [patients, propsInsurancePolicies]);

  // Review Modal States
  const [reviewItem, setReviewItem] = useState<{
    id: string;
    patientId: string;
    patientName: string;
    patientMedicalId: string;
    provider: string;
    policyNumber: string;
    type?: string;
    desc?: string;
    cardFile?: string | null;
    docName?: string;
    submissionDate: string;
    isVerification: boolean; // True if first time, false if update request
  } | null>(null);

  // Review Editable Fields
  const [revProvider, setRevProvider] = useState('Nile Health Insurance');
  const [revPolicyNumber, setRevPolicyNumber] = useState('');
  const [revCoverageType, setRevCoverageType] = useState('Full Coverage');
  const [revCoverageStatus, setRevCoverageStatus] = useState('Active');
  const [revExpiryDate, setRevExpiryDate] = useState('2026-12-31');
  const [revCoveredServices, setRevCoveredServices] = useState<string[]>([
    'Doctor Consultations',
    'Emergency Services',
    'Laboratory Tests',
    'Prescription Medication',
    'Radiology & Imaging',
    'Hospital Admission'
  ]);
  const [revClaimPercentage, setRevClaimPercentage] = useState(85);

  const handleApproveInsurance = () => {
    if (!reviewItem) return;
    
    const updatedPolicy = {
      provider: revProvider,
      policyNumber: revPolicyNumber || 'N/A',
      status: 'Active',
      type: revCoverageType,
      expiry: revExpiryDate,
      services: revCoveredServices,
      percentage: `${revClaimPercentage}%`,
      approvedBy: insuranceUser.fullName,
      approvalDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
    
    // Save to patient policy storage
    if (onUpdateInsurancePolicy) {
      onUpdateInsurancePolicy(reviewItem.patientId, updatedPolicy).catch(fbErr => {
        alert("Database Sync Failed: Policies must be saved live to Firestore: " + fbErr);
      });
    }

    // Update Request status if it's an update request
    if (!reviewItem.isVerification) {
      const updatedRequests = requests.map(r => {
        if (r.id === reviewItem.id) {
          return {
            ...r,
            status: 'Approved' as const,
            statusExplanation: `Approved by Nile Insurance Desk (${insuranceUser.fullName}). Patient record has been synchronized.`
          };
        }
        return r;
      });
      saveRequests(updatedRequests);
    } else {
      // If verification, log an approved update log too
      const newRequestLog = {
        id: `req-${Date.now()}`,
        patientId: reviewItem.patientId,
        patientName: reviewItem.patientName,
        patientMedicalId: reviewItem.patientMedicalId,
        type: 'Initial Verification',
        desc: 'New patient initial insurance plan verification.',
        date: reviewItem.submissionDate,
        status: 'Approved' as const,
        statusExplanation: `Plan record authenticated and activated by ${insuranceUser.fullName}.`
      };
      saveRequests([newRequestLog, ...requests]);
    }

    setFeedback(`Successfully Approved and Synchronized Policy for ${reviewItem.patientName}`);
    setReviewItem(null);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleRejectInsurance = () => {
    if (!reviewItem) return;

    const updatedPolicy = {
      provider: revProvider,
      policyNumber: revPolicyNumber || 'N/A',
      status: 'Rejected',
      type: revCoverageType,
      expiry: revExpiryDate,
      services: [],
      percentage: '0%',
      rejectedBy: insuranceUser.fullName,
      rejectionDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
    if (onUpdateInsurancePolicy) {
      onUpdateInsurancePolicy(reviewItem.patientId, updatedPolicy).catch(fbErr => {
        alert("Database Sync Failed: Policies must be saved live to Firestore: " + fbErr);
      });
    }

    if (!reviewItem.isVerification) {
      const updatedRequests = requests.map(r => {
        if (r.id === reviewItem.id) {
          return {
            ...r,
            status: 'Rejected' as const,
            statusExplanation: `Declined by Nile Insurance Desk (${insuranceUser.fullName}). Submitted policy details or credentials did not match.`
          };
        }
        return r;
      });
      saveRequests(updatedRequests);
    } else {
      const newRequestLog = {
        id: `req-${Date.now()}`,
        patientId: reviewItem.patientId,
        patientName: reviewItem.patientName,
        patientMedicalId: reviewItem.patientMedicalId,
        type: 'Initial Verification',
        desc: 'New patient initial insurance plan verification.',
        date: reviewItem.submissionDate,
        status: 'Rejected' as const,
        statusExplanation: `Rejected by Nile Insurance Desk (${insuranceUser.fullName}). Invalid credentials.`
      };
      saveRequests([newRequestLog, ...requests]);
    }

    setFeedback(`Insurance Registration Rejected & Filed for ${reviewItem.patientName}`);
    setReviewItem(null);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleRequestMoreInfo = () => {
    if (!reviewItem) return;

    if (!reviewItem.isVerification) {
      const updatedRequests = requests.map(r => {
        if (r.id === reviewItem.id) {
          return {
            ...r,
            status: 'Requires More Information' as const,
            statusExplanation: `The Cairo Clinic billing team requires a higher resolution copy of your insurance membership card. Please re-verify.`
          };
        }
        return r;
      });
      saveRequests(updatedRequests);
    } else {
      const newRequestLog = {
        id: `req-${Date.now()}`,
        patientId: reviewItem.patientId,
        patientName: reviewItem.patientName,
        patientMedicalId: reviewItem.patientMedicalId,
        type: 'Initial Verification',
        desc: 'New patient initial insurance plan verification.',
        date: reviewItem.submissionDate,
        status: 'Requires More Information' as const,
        statusExplanation: `Verification pending additional details. High-resolution document upload requested.`
      };
      saveRequests([newRequestLog, ...requests]);
    }

    setFeedback(`More Information Request filed for ${reviewItem.patientName}`);
    setReviewItem(null);
    setTimeout(() => setFeedback(''), 3000);
  };

  // Derive counts and metrics
  const activePatientsWithApprovedPolicy = useMemo(() => {
    return patients.filter(p => {
      const policy = propsInsurancePolicies ? propsInsurancePolicies[p.id] : null;
      return policy && policy.status === 'Active';
    }).length;
  }, [patients, propsInsurancePolicies]);

  const totalClaimsCount = claims.length;
  const pendingClaimsCount = claims.filter(c => c.status === 'PENDING').length;
  const approvedClaimsCount = claims.filter(c => c.status === 'APPROVED').length;
  const totalApprovedValue = claims.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + c.cost, 0);

  const filteredClaimsList = useMemo(() => {
    return claims.filter(c => {
      const matchesSearch = (c.patientName || '').toLowerCase().includes((claimSearch || '').toLowerCase()) || 
                            (c.id || '').toLowerCase().includes((claimSearch || '').toLowerCase());
      const matchesFilter = activeClaimFilter === 'ALL' || c.status === activeClaimFilter;
      return matchesSearch && matchesFilter;
    });
  }, [claims, claimSearch, activeClaimFilter]);

  // Nile standard plan presets for Coverage Management
  const [insurancePlans, setInsurancePlans] = useState([
    { id: 'plan-01', name: 'Nile Primary Care CarePlus', deductible: '$250', coPay: '$15', approvalRate: '98.5%', activeEnrollments: 1422, status: 'Active' },
    { id: 'plan-02', name: 'Nile Corporate Executive Gold', deductible: '$0', coPay: '$10', approvalRate: '99.1%', activeEnrollments: 2045, status: 'Active' },
    { id: 'plan-03', name: 'MedCare Standard SafetyNet', deductible: '$500', coPay: '$30', approvalRate: '94.2%', activeEnrollments: 810, status: 'Active' },
    { id: 'plan-04', name: 'Government Health Standard Plan', deductible: '$50', coPay: '$0', approvalRate: '97.8%', activeEnrollments: 3410, status: 'Active' }
  ]);

  return (
    <div id="insurance-workspace" className="space-y-6 font-sans">
      
      {/* Dynamic System Broadcaster/Success Alert */}
      {feedback && (
        <div className="p-3 bg-sky-50 text-sky-850 border border-sky-200/50 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
          <span className="h-2 w-2 rounded-full bg-sky-600 animate-ping"></span>
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. PROFESSIONAL HEADER */}
      <header className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Insurance Staff Portal</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Manage patient insurance verification, claims, and healthcare coverage.
          </p>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. DASHBOARD MAIN OVERVIEW VIEW */}
      {/* ========================================================= */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Quick Metrics Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Pending Claims</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FileCheck className="h-4 w-4" /></div>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">{pendingClaimsCount}</h2>
              <p className="text-[10px] text-slate-500 mt-1">Awaiting review</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Verifications Pending</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ShieldCheck className="h-4 w-4" /></div>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">{pendingVerifications.length}</h2>
              <p className="text-[10px] text-slate-500 mt-1">New patient insurance requests</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Active Patients Covered</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><User className="h-4 w-4" /></div>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">{activePatientsWithApprovedPolicy}</h2>
              <p className="text-[10px] text-slate-500 mt-1">Verified insurance profiles</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Approved Claims Value</span>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><TrendingUp className="h-4 w-4" /></div>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-950 mt-2 font-mono">${totalApprovedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              <p className="text-[10px] text-slate-500 mt-1">Processed reimbursements</p>
            </div>
          </section>

          {/* TWO Operational Sections: Action Queues */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Claims Queue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <FileCheck className="h-4 w-4 text-amber-500" /> Pending Claims Queue
              </h3>
              <div className="space-y-3">
                {claims.filter(c => c.status === 'PENDING').slice(0, 3).map(claim => (
                  <div key={claim.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all">
                    <div className="text-xs space-y-1 my-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900">{claim.patientName}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border">Medical ID: {claim.patientMedicalId}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p>Visit Type: <span className="font-semibold text-slate-700">{claim.diagnosis || 'Clinical Consultation'}</span></p>
                        <p>Amount: <span className="font-mono font-bold text-slate-950">${claim.cost.toFixed(2)}</span></p>
                      </div>
                      <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase font-mono mt-1">🟡 Pending Review</span>
                    </div>
                    <button
                      onClick={() => onSectionChange('claims')}
                      className="mt-2 sm:mt-0 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200/40 hover:bg-sky-100 text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      Review Claim
                    </button>
                  </div>
                ))}
                {claims.filter(c => c.status === 'PENDING').length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">No pending claims in queue.</p>
                )}
              </div>
            </div>

            {/* Insurance Verification Requests */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Insurance Verification Requests
              </h3>
              <div className="space-y-3">
                {pendingVerifications.slice(0, 3).map(verif => (
                  <div key={verif.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all">
                    <div className="text-xs space-y-1 my-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{verif.patientName}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border">Medical ID: {verif.patientMedicalId}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p>Provider: <span className="font-semibold text-slate-700">{verif.providerName || 'Nile Health Insurance'}</span></p>
                      </div>
                      <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase font-mono mt-1">🟡 Pending Verification</span>
                    </div>
                    <button
                      onClick={() => onSectionChange('verifications')}
                      className="mt-2 sm:mt-0 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200/40 hover:bg-sky-100 text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      Verify Coverage
                    </button>
                  </div>
                ))}
                {pendingVerifications.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">No pending verification requests.</p>
                )}
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 text-left">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Sliders className="h-4 w-4 text-slate-500" /> Quick Actions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1.5">
              <button
                onClick={() => onSectionChange('claims')}
                className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <FileCheck className="h-5 w-5 text-amber-500 mb-2 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-slate-900">Review Claims</h4>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">Review submitted insurance claims.</p>
              </button>

              <button
                onClick={() => onSectionChange('verifications')}
                className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <ShieldCheck className="h-5 w-5 text-emerald-500 mb-2 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-slate-900">Patient Verifications</h4>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">Approve newly submitted insurance registrations.</p>
              </button>

              <button
                onClick={() => onSectionChange('requests')}
                className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <Clipboard className="h-5 w-5 text-blue-500 mb-2 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-slate-900">Update Requests</h4>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">Review patient insurance correction requests.</p>
              </button>

              <button
                onClick={() => onSectionChange('eligibility')}
                className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50/50 hover:bg-slate-50 text-left transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <Search className="h-5 w-5 text-teal-600 mb-2 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-slate-900">Eligibility Verification</h4>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">Search and verify insurance coverage.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CLAIMS QUEUE VIEW ("Insurance Claims") */}
      {/* ========================================================= */}
      {activeSection === 'claims' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Insurance Claims Queue</h2>
              <p className="text-xs text-slate-500">Authorize or decline clinical charge files submitted by hospital doctors.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 font-mono text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                {pendingClaimsCount} Pending Adjudications
              </span>
            </div>
          </div>

          {/* Filters & Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 rounded-md text-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                placeholder="Search patient name, ID or carrier code..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-220 focus:outline-none focus:border-sky-500 rounded-xl text-xs"
              />
            </div>

            <div className="flex bg-slate-100/60 p-1 rounded-xl max-w-sm gap-1 self-start font-mono text-[10px] font-bold uppercase shrink-0">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => {
                const count = tab === 'ALL' ? totalClaimsCount : claims.filter(c => c.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveClaimFilter(tab)}
                    className={`py-1 px-3 rounded-lg transition-all cursor-pointer ${
                      activeClaimFilter === tab 
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40 font-extrabold' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab === 'PENDING' ? 'Pending' : (tab === 'APPROVED' ? 'Approved' : (tab === 'REJECTED' ? 'Declined' : 'All'))} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Claims Cards */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {filteredClaimsList.map(claim => (
              <div 
                key={claim.id} 
                className="p-5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row justify-between gap-4 transition-all"
              >
                <div className="space-y-3 text-xs text-slate-600 font-sans text-left flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded border">
                      Claim Code: {claim.id}
                    </span>
                    <h4 className="font-extrabold text-slate-950 text-sm">{claim.patientName}</h4>
                    <span className="text-[10px] text-slate-400 font-mono font-semibold">({claim.patientMedicalId})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 leading-relaxed text-[11.5px]">
                    <p><strong>Coverage Tier:</strong> {claim.coverageType}</p>
                    <p><strong>Attending Clinician:</strong> {claim.doctorName}</p>
                    <p><strong>Diagnosis Profile:</strong> <span className="font-semibold text-slate-800">{claim.diagnosis}</span></p>
                    {claim.policyNumber && <p><strong>Policy identifier:</strong> <span className="font-mono">{claim.policyNumber}</span></p>}
                  </div>

                  {/* Redesigned Visit Summary Container (replacing clinical diagnosis masked bounds) */}
                  <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/60 flex gap-2 items-start">
                    <ClipboardCheck className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-slate-800 font-bold">Visit Summary:</p>
                      <p className="text-[11px] text-slate-600">
                        Routine clinical assessment, diagnostic screening lab requisitions, and therapeutic prescription formulary allocations. Coverage authorized according to regional hospital-carrier contract agreements.
                      </p>
                    </div>
                  </div>

                  {claim.notes && (
                    <div className="text-[10.5px] bg-white p-2.5 text-slate-500 border border-slate-150 rounded-xl font-mono leading-normal">
                      <strong>Rejection/Approval Detail:</strong> {claim.notes}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-3 text-right sm:min-w-44">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-mono block font-bold leading-normal">Certified Cost</span>
                    <span className="text-xl font-extrabold font-mono text-slate-900">${claim.cost.toFixed(2)}</span>
                  </div>

                  <div className="pt-2">
                    {claim.status === 'PENDING' ? (
                      <div className="flex gap-1.5 font-mono">
                        <button
                          onClick={() => handleClaimReviewAction(claim.id, 'REJECTED')}
                          className="p-1 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-lg cursor-pointer border border-rose-150/40 flex items-center gap-1 uppercase transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-500" /> Decline Claim
                        </button>
                        
                        <button
                          onClick={() => handleClaimReviewAction(claim.id, 'APPROVED')}
                          className="p-1 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg cursor-pointer flex items-center gap-1 uppercase transition-all shadow-sm"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Approve Claim
                        </button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 text-[9px] font-extrabold font-mono rounded-full tracking-wide inline-block uppercase border ${
                        claim.status === 'APPROVED' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {claim.status === 'APPROVED' ? '✓ APPROVED' : '✗ DECLINED'}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            ))}

            {filteredClaimsList.length === 0 && (
              <p className="text-center text-slate-400 italic py-10">No matching billing claims found in the current log scope.</p>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 4. FIRST-TIME VERIFICATIONS VIEW */}
      {/* ========================================================= */}
      {activeSection === 'verifications' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
          
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Patient First-Time Verifications</h2>
            <p className="text-xs text-slate-500">Approve or reject coverage requests submitted by newly registered patients.</p>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {pendingVerifications.map((item) => (
              <div 
                key={item.id} 
                className="p-5 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
              >
                <div className="space-y-2 text-xs text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm leading-tight">{item.patientName}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-semibold">ID Code: {item.patientMedicalId}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-slate-500 text-[11px]">
                    <p>Insurance Company: <strong className="text-slate-800">{item.provider}</strong></p>
                    <p>Policy Number: <strong className="text-slate-800 font-mono">{item.policyNumber}</strong></p>
                    <p>Submission Date: <strong className="text-slate-600">{item.submissionDate}</strong></p>
                    {item.cardFile && (
                      <p className="text-sky-600 font-bold">
                        📄 Document card: <span className="underline font-medium">{item.cardFile}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end font-mono">
                  <button
                    onClick={() => {
                      setReviewItem({
                        id: item.id,
                        patientId: item.patientId,
                        patientName: item.patientName,
                        patientMedicalId: item.patientMedicalId,
                        provider: item.provider,
                        policyNumber: item.policyNumber,
                        cardFile: item.cardFile,
                        submissionDate: item.submissionDate,
                        isVerification: true
                      });
                      setRevProvider(item.provider);
                      setRevPolicyNumber(item.policyNumber);
                      setRevCoverageType('Full Coverage');
                      setRevCoverageStatus('Active');
                      setRevExpiryDate('2026-12-31');
                      setRevCoveredServices([
                        'Doctor Consultations',
                        'Emergency Services',
                        'Laboratory Tests',
                        'Prescription Medication',
                        'Radiology & Imaging',
                        'Hospital Admission'
                      ]);
                      setRevClaimPercentage(85);
                    }}
                    className="px-4 py-2 bg-sky-50 text-sky-700 border border-sky-200/50 hover:bg-sky-100 font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Search className="h-3.5 w-3.5" /> Review details
                  </button>

                  <button
                    onClick={() => {
                      setReviewItem({
                        id: item.id,
                        patientId: item.patientId,
                        patientName: item.patientName,
                        patientMedicalId: item.patientMedicalId,
                        provider: item.provider,
                        policyNumber: item.policyNumber,
                        cardFile: item.cardFile,
                        submissionDate: item.submissionDate,
                        isVerification: true
                      });
                      setRevProvider(item.provider);
                      setRevPolicyNumber(item.policyNumber);
                      setRevCoverageType('Full Coverage');
                      setRevCoverageStatus('Active');
                      setRevExpiryDate('2026-12-31');
                      setRevCoveredServices([
                        'Doctor Consultations',
                        'Emergency Services',
                        'Laboratory Tests',
                        'Prescription Medication',
                        'Radiology & Imaging',
                        'Hospital Admission'
                      ]);
                      setRevClaimPercentage(85);
                    }}
                    className="px-4.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Verify plan
                  </button>
                </div>
              </div>
            ))}

            {pendingVerifications.length === 0 && (
              <p className="text-center text-slate-400 italic py-10">No first-time verifications are currently outstanding.</p>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 5. PATIENT UPDATE REQUESTS VIEW */}
      {/* ========================================================= */}
      {activeSection === 'requests' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Patient Update Requests</h2>
              <p className="text-xs text-slate-500">Process requests immediately submitted by patients requesting info corrections or policy updates.</p>
            </div>
            
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-100 rounded-lg shrink-0">
              {requests.filter(r => r.status === 'Pending Review').length} Pending review
            </span>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {requests.map(req => {
              let badgeColor = '';
              switch (req.status) {
                case 'Pending Review':
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  break;
                case 'Approved':
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  break;
                case 'Rejected':
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  break;
                case 'Requires More Information':
                  badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
                  break;
              }

              return (
                <div 
                  key={req.id} 
                  className="p-5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all text-xs text-slate-700 space-y-3 text-left"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[9px] bg-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-600">
                          {req.patientMedicalId}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm">{req.patientName}</h4>
                      </div>
                      <p className="text-slate-400 font-mono text-[10px]">
                        Filed on: {req.date} | Request category: <strong className="text-slate-700">{req.type}</strong>
                      </p>
                    </div>
                    
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold font-mono border tracking-wide uppercase ${badgeColor}`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Patient Statement:</span>
                    <p className="text-slate-600 italic">"{req.desc}"</p>
                    {req.docName && (
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-lg mt-2 font-mono">
                        <FileText className="h-3.5 w-3.5 shrink-0" /> Attachment card: <span className="underline">{req.docName}</span>
                      </div>
                    )}
                  </div>

                  {req.statusExplanation && (
                    <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 font-mono text-[10.5px] text-slate-500 leading-normal">
                      <strong>Remarks:</strong> {req.statusExplanation}
                    </div>
                  )}

                  {(req.status === 'Pending Review' || req.status === 'Requires More Information') && (
                    <div className="pt-1.5 flex justify-end font-mono">
                      <button
                        onClick={() => {
                          setReviewItem({
                            id: req.id,
                            patientId: req.patientId,
                            patientName: req.patientName,
                            patientMedicalId: req.patientMedicalId,
                            provider: 'Nile Health Insurance',
                            policyNumber: 'PL-Pending',
                            desc: req.desc,
                            docName: req.docName,
                            submissionDate: req.date,
                            isVerification: false
                          });
                          
                          const policy = propsInsurancePolicies ? propsInsurancePolicies[req.patientId] : null;
                          if (policy) {
                            try {
                              setRevProvider(policy.provider || 'Nile Health Insurance');
                              setRevPolicyNumber(policy.policyNumber || '');
                              setRevCoverageType(policy.type || 'Full Coverage');
                              setRevCoverageStatus('Active');
                              setRevExpiryDate(policy.expiry || '2026-12-31');
                              setRevCoveredServices(policy.services || [
                                'Doctor Consultations',
                                'Emergency Services',
                                'Laboratory Tests',
                                'Prescription Medication',
                                'Radiology & Imaging',
                                'Hospital Admission'
                              ]);
                              setRevClaimPercentage(parseInt(policy.percentage) || 85);
                            } catch (e) {}
                          } else {
                            setRevProvider('Nile Health Insurance');
                            setRevPolicyNumber(req.type === 'Incorrect Policy Number' ? 'NLE-55120-M' : '');
                            setRevCoverageType('Full Coverage');
                            setRevCoverageStatus('Active');
                            setRevExpiryDate('2026-12-31');
                            setRevCoveredServices([
                              'Doctor Consultations',
                              'Emergency Services',
                              'Laboratory Tests',
                              'Prescription Medication',
                              'Radiology & Imaging',
                              'Hospital Admission'
                            ]);
                            setRevClaimPercentage(85);
                          }
                        }}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Search className="h-3.5 w-3.5 animate-pulse" /> Review & Edit Policy
                      </button>
                    </div>
                  )}

                </div>
              );
            })}

            {requests.length === 0 && (
              <p className="text-center text-slate-400 italic py-10">No update requests found in the archives.</p>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 6. ELIGIBILITY VERIFICATION PORTAL */}
      {/* ========================================================= */}
      {activeSection === 'eligibility' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
          
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Insurance Eligibility Search</h2>
            <p className="text-xs text-slate-500">Query enrollment status, co-payment parameters, and active medical insurance details instantly.</p>
          </div>

          <div className="relative rounded-md text-xs max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              value={eligibilitySearch}
              onChange={(e) => setEligibilitySearch(e.target.value)}
              placeholder="Search by keywords (e.g., 'Ahmed Salah' or 'MID-')"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-220 focus:outline-none focus:border-sky-500 rounded-xl text-xs font-semibold"
            />
          </div>

          {matchedEligibility ? (
            <div className="p-6 bg-slate-50/50 rounded-2xl space-y-4 border border-slate-200 text-xs text-slate-600 animate-in fade-in duration-150 text-left max-w-2xl">
              <div className="flex justify-between items-start border-b border-slate-200/50 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{matchedEligibility.fullName}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Patient Record Key: {matchedEligibility.id}</p>
                </div>
                <span className="px-2.5 py-1 text-[9.5px] font-bold bg-emerald-100 text-emerald-800 rounded-md">ELIGIBLE / ACTIVE</span>
              </div>

              <div className="space-y-2">
                <span className="text-[9.5px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Plan enrollment parameters</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 leading-relaxed text-[11.5px]">
                  <p><strong>Universal Med ID:</strong> {matchedEligibility.medicalId || 'Not Allocated'}</p>
                  <p><strong>Identity Registry Code:</strong> <span className="font-mono">{matchedEligibility.nationalId}</span></p>
                  <p><strong>Patient Contact Phone:</strong> {matchedEligibility.phoneNumber}</p>
                  
                  {(() => {
                    const policy = propsInsurancePolicies ? propsInsurancePolicies[matchedEligibility.id] : null;
                    if (policy) {
                      return (
                        <>
                          <p><strong>Affiliated Provider:</strong> {policy.provider || 'N/A'}</p>
                          <p><strong>Registry Policy #:</strong> <span className="font-mono font-bold text-slate-900">{policy.policyNumber || 'N/A'}</span></p>
                          <p><strong>Coverage Expiries:</strong> {policy.expiry || 'N/A'}</p>
                          <p><strong>Approved Co-Insurance:</strong> {policy.percentage || '85%'}</p>
                        </>
                      );
                    }
                    return (
                      <p className="text-amber-600 font-bold col-span-2">No verified policy file linked. Go to verifications to allocate plans.</p>
                    );
                  })()}
                </div>
              </div>

              <div className="pt-3.5 border-t border-slate-200/60 font-mono text-[9.5px] text-slate-500 space-y-1">
                <p>✔ Copays: Standard Clinic Consultations $15.00 | Diagnostics 15% Co-Insurance</p>
                <p>✔ Annual Re-Authorization Ceiling: $75,000.00</p>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center py-10 text-xs text-slate-400 max-w-xl">
              No query entry matched. Type a patient legal name or ID code in the keyboard search bar above.
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* 9. SETTINGS VIEW */}
      {/* ========================================================= */}
      {activeSection === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200 text-left max-w-xl">
          
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Portal & Workspace Settings</h2>
            <p className="text-xs text-slate-500">Configure Cairo clinic insurance desk notification filters and audit logs preferences.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 hover:border-slate-300 transition-all space-y-3">
            <h3 className="font-extrabold text-slate-900">Cairo clinic station keys</h3>
            <div className="space-y-1.5 leading-relaxed text-[11.5px]">
              <p>Registered Operator: <strong>{insuranceUser.fullName}</strong></p>
              <p>Email Dispatch Address: <strong className="text-slate-800">{insuranceUser.email}</strong></p>
              <p>Role Permission Tier: <strong className="text-sky-600 font-mono">INSURANCE_OPERATOR</strong></p>
              <p>Network Station Signature: <strong className="font-mono text-slate-500">EG-CAI-DESK-09</strong></p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onLogout}
              className="py-2.5 px-5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold font-mono text-xs uppercase cursor-pointer rounded-xl border border-rose-220 transition-all"
            >
              Log out portal session
            </button>
          </div>

        </div>
      )}


      {/* ========================================================= */}
      {/* 10. VERIFICATION REVIEW & UPDATE MODAL */}
      {/* ========================================================= */}
      <AnimatePresence>
        {reviewItem && (
          <div id="insurance-review-modal" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-left"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full uppercase tracking-wider">
                    {reviewItem.isVerification ? 'Verification Review' : 'Health Policy Amendment'}
                  </span>
                  <h3 className="text-lg font-sans font-extrabold text-slate-900 mt-1">
                    Verification Review
                  </h3>
                  <p className="text-slate-500 text-xs leading-normal">
                    Confirm enrollment plan eligibility parameters, identity cards, and configure active co-insurance rates.
                  </p>
                </div>
                <button
                  onClick={() => setReviewItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Submitted Patient Information Panel */}
              <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-xl space-y-3 text-xs text-slate-600 leading-relaxed font-sans">
                <h4 className="font-bold text-slate-900 text-xs bg-slate-200/50 p-1 px-2 rounded uppercase tracking-wider block font-mono inline-block">Submitted Patient Identification</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11.5px]">
                  <p><strong>Patient Legal Name:</strong> <span className="text-slate-900 font-semibold">{reviewItem.patientName}</span></p>
                  <p><strong>Medical ID Link Code:</strong> <span className="font-mono text-slate-900 font-semibold">{reviewItem.patientMedicalId}</span></p>
                  <p><strong>System Registry Key:</strong> <span className="font-mono text-slate-550">{reviewItem.patientId}</span></p>
                  <p><strong>Proposed Provider:</strong> <span className="text-slate-900 font-semibold">{reviewItem.provider}</span></p>
                  <p><strong>Proposed Policy #:</strong> <span className="font-mono text-slate-900 font-semibold">{reviewItem.policyNumber}</span></p>
                </div>

                {!reviewItem.isVerification && reviewItem.desc && (
                  <div className="pt-2.5 border-t border-slate-200/60 mt-2 space-y-1">
                    <span className="font-bold text-slate-700 block uppercase text-[9px] tracking-wide font-mono">Patient Issue Statement:</span>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700 italic font-mono leading-relaxed">
                      "{reviewItem.desc}"
                    </div>
                  </div>
                )}

                {(reviewItem.cardFile || reviewItem.docName) && (
                  <div className="pt-2 border-t border-slate-200/50 mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-700 uppercase text-[9px] tracking-wide font-mono">Uploaded Card Proof:</span>
                    <div className="inline-flex items-center gap-1.5 text-[10.5px] text-sky-700 bg-sky-50 border border-sky-150 px-2.5 py-1 rounded-lg font-mono">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span>{reviewItem.cardFile || reviewItem.docName}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Editable Insurance Parameters Form */}
              <div className="space-y-4 pt-1">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider block font-mono">Configure verified health policy values</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Insurance Provider */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Insurance Carrier</label>
                    <select
                      value={revProvider}
                      onChange={(e) => setRevProvider(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-250 focus:bg-white rounded-xl text-xs text-slate-950 outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer font-semibold"
                    >
                      <option value="Nile Health Insurance">Nile Health Insurance</option>
                      <option value="MedCare Insurance">MedCare Insurance</option>
                      <option value="AXA Healthcare">AXA Healthcare</option>
                      <option value="Government Health Insurance">Government Health Insurance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Policy Number */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Policy Number</label>
                    <input
                      type="text"
                      value={revPolicyNumber}
                      onChange={(e) => setRevPolicyNumber(e.target.value)}
                      required
                      placeholder="Enter policy membership ID"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-250 focus:bg-white rounded-xl text-xs font-mono text-slate-950 outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                    />
                  </div>

                  {/* Coverage Type */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Coverage Type</label>
                    <select
                      value={revCoverageType}
                      onChange={(e) => setRevCoverageType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-250 focus:bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer font-semibold"
                    >
                      <option value="Full Coverage">Full Coverage</option>
                      <option value="Partial Coverage">Partial Coverage</option>
                      <option value="Emergency Only">Emergency Only</option>
                      <option value="Consultation Coverage">Consultation Coverage</option>
                    </select>
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Coverage Expiry Date</label>
                    <input
                      type="date"
                      value={revExpiryDate}
                      onChange={(e) => setRevExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-250 focus:bg-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer font-semibold"
                    />
                  </div>

                  {/* Claim Coverage Percentage */}
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">
                      <span>Co-insurance claim coverage percentage</span>
                      <span className="text-sky-600 font-mono text-xs font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{revClaimPercentage}%</span>
                    </div>
                    <div className="flex items-center gap-3 pt-1.5">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={revClaimPercentage}
                        onChange={(e) => setRevClaimPercentage(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Covered Services */}
                <div className="space-y-2 pt-1 font-sans">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide font-mono">Covered Services (In-Network)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 border border-slate-205 rounded-xl">
                    {[
                      'Doctor Consultations',
                      'Emergency Services',
                      'Laboratory Tests',
                      'Prescription Medication',
                      'Radiology & Imaging',
                      'Hospital Admission'
                    ].map((service) => {
                      const isChecked = revCoveredServices.includes(service);
                      return (
                        <label key={service} className="flex items-center gap-2.5 py-0.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setRevCoveredServices(revCoveredServices.filter(s => s !== service));
                              } else {
                                setRevCoveredServices([...revCoveredServices, service]);
                              }
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500 border-slate-300 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-slate-800 font-semibold">{service}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 font-sans font-semibold">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-4.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-220 text-slate-600 text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  onClick={handleRequestMoreInfo}
                  className="px-4.5 py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Info className="h-4 w-4 shrink-0 text-orange-500" /> Request Details
                </button>

                <button
                  type="button"
                  onClick={handleRejectInsurance}
                  className="px-4.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-220 text-rose-700 text-xs rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <XCircle className="h-4 w-4 shrink-0 text-rose-500" /> Reject Insurance
                </button>

                <button
                  type="button"
                  onClick={handleApproveInsurance}
                  className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
                >
                  <CheckCircle className="h-4 w-4 shrink-0" /> Approve & Synchronize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
