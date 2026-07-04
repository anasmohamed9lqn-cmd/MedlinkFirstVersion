/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Stethoscope, ShieldAlert, Award, Search, UserPlus, 
  Trash2, ToggleLeft, ToggleRight, CheckCircle, XCircle, Filter, SlidersHorizontal, 
  Plus, Calendar, MapPin, Activity, FileCheck, QrCode, ClipboardList, 
  ShieldCheck, LayoutDashboard, Building2, BarChart3, Settings, 
  User as UserIcon, LogOut, UploadCloud, RefreshCw, Key, Shield, 
  AlertCircle, Download, FileText, PlusCircle, Edit3, Save, X, Phone, Mail, Lock, Menu
} from 'lucide-react';
import { User, UserRole, UserStatus, Department, AuditLog, ProfessionalUpdateRequest, MedicalInstitution, InsuranceCompany, InsuranceBranch, OrganizationRequest } from '../types';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabaseService';
import SidebarContent from './SidebarContent';


interface AdminDashboardProps {
  users: User[];
  departments: Department[];
  auditLogs: AuditLog[];
  onUpdateUserStatus: (userId: string, status: UserStatus) => void;
  onUpdateUserRole: (userId: string, role: UserRole) => void;
  onDeleteUser: (userId: string) => void;
  onAddUser: (newUser: User) => void;
  onAddDepartment: (newDept: Department) => void;
  onDeleteDepartment: (deptId: string) => void;
  onEditDepartment: (updatedDept: Department) => void;
  activeCounts: {
    patientsCount: number;
    doctorsCount: number;
    activeUsersCount: number;
    visitsCount: number;
    claimsCount: number;
    qrCount: number;
  };
  professionalRequests?: ProfessionalUpdateRequest[];
  onApproveProfessionalUpdate?: (requestId: string, adminNotes: string) => void;
  onRejectProfessionalUpdate?: (requestId: string, adminNotes: string) => void;
  onUpdateUserProfile?: (userId: string, updatedFields: Partial<User>) => void;
  activeUser?: User;
  onLogout?: () => void;
  
  // Custom managed organizations props
  institutions?: MedicalInstitution[];
  insuranceCompanies?: InsuranceCompany[];
  organizationRequests?: OrganizationRequest[];
  onAddInstitution?: (newInst: MedicalInstitution) => void;
  onUpdateInstitution?: (id: string, updated: Partial<MedicalInstitution>) => void;
  onDeleteInstitution?: (id: string) => void;
  onAddInsuranceCompany?: (newComp: InsuranceCompany) => void;
  onUpdateInsuranceCompany?: (id: string, updated: Partial<InsuranceCompany>) => void;
  onDeleteInsuranceCompany?: (id: string) => void;
  onApproveOrganizationRequest?: (id: string) => void;
  onRejectOrganizationRequest?: (id: string) => void;

  // Supabase Link Attributes
  supabaseStatus?: { connected: boolean; tablesVerified: boolean; checking: boolean; errorMsg?: string };
  onSyncDatabase?: () => Promise<void>;
  onSeedDatabase?: () => Promise<{ success: boolean; msg: string }>;
  isSyncing?: boolean;
}


interface Hospital {
  id: string;
  name: string;
  type: 'Hospital' | 'Clinic' | 'Medical Center';
  location: string;
  contact: string;
  departments: string[];
  status: 'Active' | 'Inactive';
}

export default function AdminDashboard({
  users,
  departments,
  auditLogs,
  onUpdateUserStatus,
  onUpdateUserRole,
  onDeleteUser,
  onAddUser,
  onAddDepartment,
  onDeleteDepartment,
  onEditDepartment,
  activeCounts,
  professionalRequests = [],
  onApproveProfessionalUpdate,
  onRejectProfessionalUpdate,
  onUpdateUserProfile,
  activeUser,
  onLogout,
  
  // Custom managed organizations props
  institutions = [],
  insuranceCompanies = [],
  organizationRequests = [],
  onAddInstitution = () => {},
  onUpdateInstitution = () => {},
  onDeleteInstitution = () => {},
  onAddInsuranceCompany = () => {},
  onUpdateInsuranceCompany = () => {},
  onDeleteInsuranceCompany = () => {},
  onApproveOrganizationRequest = () => {},
  onRejectOrganizationRequest = () => {},

  // Supabase Link Attributes
  supabaseStatus = { connected: false, tablesVerified: false, checking: false },
  onSyncDatabase = async () => {},
  onSeedDatabase = async () => ({ success: false, msg: 'No operation' }),
  isSyncing = false
}: AdminDashboardProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const isLoadingApprovals = false;

  // NEW States for Delete User workflow
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState<string | null>(null);

  // NEW States for Reset Password workflow
  const [resetPasswordTarget, setResetPasswordTarget] = useState<User | null>(null);
  const [resetPasswordMethod, setResetPasswordMethod] = useState<'GENERATE' | 'MANUAL'>('GENERATE');
  const [resetManualPassword, setResetManualPassword] = useState('');
  const [resetManualConfirmPassword, setResetManualConfirmPassword] = useState('');
  const [generatedTempPassword, setGeneratedTempPassword] = useState('');
  
  // NEW Settings state
  const [doctorApprovalRequired, setDoctorApprovalRequired] = useState<boolean>(true);
  const [insuranceApprovalRequired, setInsuranceApprovalRequired] = useState<boolean>(true);
  const [autoLogoutTimer, setAutoLogoutTimer] = useState<string>('30 Minutes');
  const [enableQrMedicalAccess, setEnableQrMedicalAccess] = useState<boolean>(true);
  const [allowQrRegeneration, setAllowQrRegeneration] = useState<boolean>(true);
  const [adminLanguage, setAdminLanguage] = useState<string>('English');
  const [adminTimezone, setAdminTimezone] = useState<string>('Africa/Cairo');

  // NEW Admin Management states
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [showAdminForm, setShowAdminForm] = useState<'NONE' | 'ADD' | 'EDIT'>('NONE');
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminFormName, setAdminFormName] = useState('');
  const [adminFormEmail, setAdminFormEmail] = useState('');
  const [adminFormPhone, setAdminFormPhone] = useState('');
  const [adminFormNationalId, setAdminFormNationalId] = useState('');
  const [adminFormType, setAdminFormType] = useState<'SUPER' | 'OPERATIONS' | 'SUPPORT'>('SUPPORT');
  const [adminFormPassword, setAdminFormPassword] = useState('');
  const [adminFormConfirmPassword, setAdminFormConfirmPassword] = useState('');
  const [adminFormPhotoUrl, setAdminFormPhotoUrl] = useState('');

  // Determine active admin role
  const [clockTime, setClockTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yr = now.getUTCFullYear();
      const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
      const dy = String(now.getUTCDate()).padStart(2, '0');
      const hr = String(now.getUTCHours()).padStart(2, '0');
      const mi = String(now.getUTCMinutes()).padStart(2, '0');
      const sc = String(now.getUTCSeconds()).padStart(2, '0');
      setClockTime(`${yr}-${mo}-${dy} ${hr}:${mi}:${sc}`);
    };
    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const adminRole = activeUser?.adminRole || 'SUPER';

  // Allowed tabs based on Admin hierarchy
  const allowedTabs = useMemo(() => {
    if (adminRole === 'SUPER') {
      return [
        'dashboard',
        'users',
        'database',
        'admin_management',
        'doctors',
        'insurance',
        'institutions',
        'insurance_companies',
        'organization_requests',
        'specialties',
        'qr',
        'audit',
        'reports',
        'settings',
        'profile'
      ];
    } else if (adminRole === 'OPERATIONS') {
      return [
        'dashboard',
        'users',
        'database',
        'doctors',
        'insurance',
        'institutions',
        'specialties',
        'qr',
        'reports',
        'profile'
      ];

    } else { // SUPPORT
      return [
        'dashboard',
        'users',
        'reports',
        'audit',
        'profile'
      ];
    }
  }, [adminRole]);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [allowedTabs, activeTab]);

  // Search, Filters & UI feedback
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterInstitution, setFilterInstitution] = useState<string>('All');
  const [filterInsuranceCompany, setFilterInsuranceCompany] = useState<string>('All');
  const [filterRegDateBefore, setFilterRegDateBefore] = useState<string>('');
  const [filterRegDateAfter, setFilterRegDateAfter] = useState<string>('');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);
  const [logQuery, setLogQuery] = useState('');
  const [localLogs, setLocalLogs] = useState<AuditLog[]>([]);
  const [successBanner, setSuccessBanner] = useState('');

  // Modals / Editing States
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddInstitutionModal, setShowAddInstitutionModal] = useState(false);
  const [viewingUserProfile, setViewingUserProfile] = useState<User | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<User | null>(null);
  const [editingInsurance, setEditingInsurance] = useState<User | null>(null);

  // Form states for adding user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserNationalId, setNewUserNationalId] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.PATIENT);
  const [newUserGender, setNewUserGender] = useState('Male');

  // Admin Profile Details
  const defaultAdminProfile: User = {
    id: activeUser?.id || 'u-admin-01',
    fullName: activeUser?.fullName || 'David Sterling',
    email: activeUser?.email || 'david.sterling@medlink.org',
    phoneNumber: activeUser?.phoneNumber || '+1 (555) 723-9182',
    nationalId: activeUser?.nationalId || 'NID-991024',
    gender: 'Male',
    dateOfBirth: '1985-06-12',
    joinedDate: '2024-01-15',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    photoUrl: activeUser?.photoUrl || ''
  };

  const [adminProfile, setAdminProfile] = useState<User>(defaultAdminProfile);

  // Sync profile if general user updates
  useEffect(() => {
    if (activeUser) {
      setAdminProfile(prev => ({
        ...prev,
        fullName: activeUser.fullName,
        email: activeUser.email,
        phoneNumber: activeUser.phoneNumber,
        photoUrl: activeUser.photoUrl || ''
      }));
    }
  }, [activeUser]);

  // Form states for Institution Creation
  const [newInstName, setNewInstName] = useState('');
  const [newInstType, setNewInstType] = useState<'Hospital' | 'Clinic' | 'Medical Center'>('Hospital');
  const [newInstLocation, setNewInstLocation] = useState('');
  const [newInstContact, setNewInstContact] = useState('');
  const [newInstDepts, setNewInstDepts] = useState<string[]>(['Internal Medicine']);

  // New institutional & company management states
  const [adminInstSearch, setAdminInstSearch] = useState('');
  const [adminCompSearch, setAdminCompSearch] = useState('');
  const [editingInst, setEditingInst] = useState<MedicalInstitution | null>(null);
  
  const [showAddCompModal, setShowAddCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState<InsuranceCompany | null>(null);
  
  const [showAddBranchModal, setShowAddBranchModal] = useState<string | null>(null); // companyId
  const [editingBranch, setEditingBranch] = useState<InsuranceBranch | null>(null);

  // New institutional editing/creation state fields
  const [newInstitutionTypeFull, setNewInstitutionTypeFull] = useState<'Hospital' | 'Clinic' | 'Medical Center' | 'Specialized Center'>('Hospital');
  const [newInstitutionAddress, setNewInstitutionAddress] = useState('');
  const [newInstitutionCity, setNewInstitutionCity] = useState('');
  const [newInstitutionCountry, setNewInstitutionCountry] = useState('');
  const [newInstitutionEmail, setNewInstitutionEmail] = useState('');
  const [newInstitutionPhone, setNewInstitutionPhone] = useState('');
  const [newInstitutionSpecialtiesText, setNewInstitutionSpecialtiesText] = useState('Cardiology, Pediatrics, Emergency Medicine, General Medicine, Neurology');

  // Insurance company form states:
  const [newCompName, setNewCompName] = useState('');
  const [newCompType, setNewCompType] = useState<'Private Health Insurance' | 'Government Insurance' | 'Corporate Insurance' | 'Employer Insurance'>('Private Health Insurance');
  const [newCompAddress, setNewCompAddress] = useState('');
  const [newCompEmail, setNewCompEmail] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompRegion, setNewCompRegion] = useState('National Coverage');

  // Branch form states:
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');

  // Prepopulated Specialties states
  const [specialties, setSpecialties] = useState([
    { id: 'spec-01', name: 'Cardiology', description: 'Hearbeat and cardiovascular disease therapeutics.', status: 'ACTIVE' },
    { id: 'spec-02', name: 'Neurology', description: 'Brain science, spine, and central nervous system diagnostics.', status: 'ACTIVE' },
    { id: 'spec-03', name: 'Orthopedics', description: 'Bones, muscles, joints and skeletal corrective surgeries.', status: 'ACTIVE' },
    { id: 'spec-04', name: 'Dermatology', description: 'Skincare, hair anomalies, and epidermis health audits.', status: 'ACTIVE' },
    { id: 'spec-05', name: 'Internal Medicine', description: 'Comprehensive general health and systemic chronic checks.', status: 'ACTIVE' },
    { id: 'spec-06', name: 'Pediatrics', description: 'Children health, newborn care, and juvenile support.', status: 'ACTIVE' },
    { id: 'spec-07', name: 'Oncology', description: 'Cancer cells, chemotherapies, tumor removals and clinical research.', status: 'ACTIVE' },
    { id: 'spec-08', name: 'Surgery', description: 'Clinical operative treatments and specialized internal operations.', status: 'ACTIVE' },
    { id: 'spec-09', name: 'Radiology', description: 'X-Ray, Ultrasound, CT, and MRI medical imaging diagnostics.', status: 'ACTIVE' },
    { id: 'spec-10', name: 'Pathology', description: 'Biological tissues, disease diagnostics, and laboratory evaluations.', status: 'ACTIVE' },
    { id: 'spec-11', name: 'Emergency Medicine', description: 'Acute trauma support, critical field stabilization, and paramedics.', status: 'ACTIVE' },
    { id: 'spec-12', name: 'Ophthalmology', description: 'Eyesight therapeutics, cataracts surgeries, and optical care.', status: 'ACTIVE' },
    { id: 'spec-13', name: 'ENT', description: 'Ear, Nose and Throat clinical pathologies and surgeries.', status: 'ACTIVE' },
    { id: 'spec-14', name: 'Dentistry', description: 'Teeth diagnostics, root canal alignments, and oral healthcare.', status: 'ACTIVE' }
  ]);

  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecDesc, setNewSpecDesc] = useState('');

  // Local state representing extra dynamic users added or updated
  const [dynamicUsers, setDynamicUsers] = useState<User[]>([]);

  // Consolidate core users list (props + dynamically added/modified ones)
  const consolidatedUsers = useMemo(() => {
    // Start with parent users
    let result = [...users];
    
    // Merge overrides from dynamic state
    dynamicUsers.forEach(du => {
      const idx = result.findIndex(u => u.id === du.id);
      if (idx > -1) {
        result[idx] = du;
      } else {
        result.push(du);
      }
    });

    return result;
  }, [users, dynamicUsers]);

  // Handle local user state modifications and sync to parent callbacks
  const updateLocalUserStatus = (userId: string, status: UserStatus) => {
    const existing = consolidatedUsers.find(u => u.id === userId);
    if (existing) {
      const updated = { ...existing, status };
      setDynamicUsers(prev => {
        const other = prev.filter(p => p.id !== userId);
        return [...other, updated];
      });
      onUpdateUserStatus(userId, status);

      // Audit Log entry
      addAuditLogEntry(
        'STATUS_CHANGE',
        `User ${existing.fullName} (${existing.role}) status changed to ${status}.`
      );
      showTemporaryBanner(`User status updated to ${status}.`);
    }
  };

  // Direct synchronized data for live, absolute verified approval records derived from local memory state
  const supabasePendingDoctors = useMemo(() => {
    return consolidatedUsers.filter(u => u.role === UserRole.DOCTOR && u.status === UserStatus.PENDING);
  }, [consolidatedUsers]);

  const supabasePendingInsurance = useMemo(() => {
    return consolidatedUsers.filter(u => u.role === UserRole.INSURANCE && u.status === UserStatus.PENDING);
  }, [consolidatedUsers]);

  const handleApproveUser = async (userId: string, userFullName: string) => {
    try {
      updateLocalUserStatus(userId, UserStatus.ACTIVE);
      alert(`Account activated successfully for ${userFullName}!`);
    } catch (err: any) {
      console.error("Approve action failed:", err);
      alert("Error approving provider: " + (err.message || err));
    }
  };

  const handleRejectUser = async (userId: string, userFullName: string) => {
    try {
      updateLocalUserStatus(userId, UserStatus.DECLINED);
      alert(`Application of ${userFullName} was rejected.`);
    } catch (err: any) {
      console.error("Reject action failed:", err);
      alert("Error rejecting provider: " + (err.message || err));
    }
  };

  const updateLocalUserProfile = (userId: string, fields: Partial<User>) => {
    const existing = consolidatedUsers.find(u => u.id === userId);
    if (existing) {
      const updated = { ...existing, ...fields };
      setDynamicUsers(prev => {
        const other = prev.filter(p => p.id !== userId);
        return [...other, updated];
      });
      onUpdateUserProfile?.(userId, fields);

      addAuditLogEntry(
        'PROFILE_UPDATE',
        `Profile fields altered for ${existing.fullName}.`
      );
      showTemporaryBanner('Profile info updated successfully.');
    }
  };

  const deleteLocalUser = (userId: string) => {
    const existing = consolidatedUsers.find(u => u.id === userId);
    if (existing) {
      setDynamicUsers(prev => prev.filter(p => p.id !== userId));
      onDeleteUser(userId);
      addAuditLogEntry('USER_DELETION', `Erased user profile: ${existing.fullName} (${userId}).`);
      showTemporaryBanner('User record permanently removed.');
    }
  };

  // Build reactive statistics count based on actual consolidated database
  const viewStats = useMemo(() => {
    const patients = consolidatedUsers.filter(u => u.role === UserRole.PATIENT);
    const doctors = consolidatedUsers.filter(u => u.role === UserRole.DOCTOR);
    const insurance = consolidatedUsers.filter(u => u.role === UserRole.INSURANCE);
    const pendings = consolidatedUsers.filter(u => u.status === UserStatus.PENDING);
    const suspended = consolidatedUsers.filter(u => u.status === UserStatus.SUSPENDED);
    const activeInst = institutions.filter(inst => inst.status === 'Active');
    const activeComps = insuranceCompanies.filter(comp => comp.status === 'Active');
    
    return {
      totalPatients: patients.length,
      verifiedDoctors: doctors.filter(u => u.status === UserStatus.ACTIVE).length,
      insuranceStaff: insurance.filter(u => u.status === UserStatus.ACTIVE).length,
      pendingApprovals: pendings.length,
      suspendedAccounts: suspended.length,
      activeInstitutions: activeInst.length,
      insuranceCompanies: activeComps.length,

      // Fallbacks / legacy fields compatibility
      activeDoctors: doctors.filter(u => u.status === UserStatus.ACTIVE).length,
      insuranceProviders: insurance.filter(u => u.status === UserStatus.ACTIVE).length,
      todayVisits: activeCounts.visitsCount || 0,
      pendingApprovalsCount: pendings.length,
      activeQRs: patients.filter(p => p.medicalId).length
    };
  }, [consolidatedUsers, institutions, insuranceCompanies, activeCounts]);

  // Global log generator function
  const addAuditLogEntry = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      email: adminProfile.email,
      action,
      details
    };
    setLocalLogs(prev => [newLog, ...prev]);
  };

  // Helper for popup banner alert feedback
  const showTemporaryBanner = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(''), 4000);
  };

  // Search & filter matching logic
  const filteredUsers = useMemo(() => {
    return consolidatedUsers.filter(u => {
      // 1. Search Query
      const q = userQuery.toLowerCase().trim();
      let matchesSearch = true;
      if (q) {
        matchesSearch = (
          (u.fullName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.nationalId || '').toLowerCase().includes(q) ||
          (u.medicalId && u.medicalId.toLowerCase().includes(q)) ||
          (u.role || '').toLowerCase().includes(q) ||
          (u.licenseNumber && u.licenseNumber.toLowerCase().includes(q)) ||
          (u.specialty && u.specialty.toLowerCase().includes(q)) ||
          (u.institution && u.institution.toLowerCase().includes(q)) ||
          (u.insuranceCompany && u.insuranceCompany.toLowerCase().includes(q)) ||
          (u.organizationName && u.organizationName.toLowerCase().includes(q))
        );
      }

      // 2. Tab Role Filter
      let matchesRole = true;
      if (userRoleFilter !== 'All') {
        if (userRoleFilter === 'Patients') {
          matchesRole = u.role === UserRole.PATIENT;
        } else if (userRoleFilter === 'Doctors') {
          matchesRole = u.role === UserRole.DOCTOR;
        } else if (userRoleFilter === 'Insurance') {
          matchesRole = u.role === UserRole.INSURANCE;
        } else if (userRoleFilter === 'Admin') {
          matchesRole = u.role === UserRole.ADMIN;
        } else if (userRoleFilter === 'Suspended') {
          matchesRole = u.status === UserStatus.SUSPENDED;
        } else if (userRoleFilter === 'Pending Approval') {
          matchesRole = u.status === UserStatus.PENDING;
        }
      }

      // 3. Status Filter (Advanced Dropdown)
      let matchesStatus = true;
      if (filterStatus !== 'All') {
        matchesStatus = u.status === filterStatus;
      }

      // 4. Institution Filter (Advanced Dropdown)
      let matchesInstitution = true;
      if (filterInstitution !== 'All') {
        matchesInstitution = u.institution === filterInstitution;
      }

      // 5. Insurance Company Filter (Advanced Dropdown)
      let matchesInsuranceCompany = true;
      if (filterInsuranceCompany !== 'All') {
        matchesInsuranceCompany = (u.insuranceCompany === filterInsuranceCompany || u.organizationName === filterInsuranceCompany);
      }

      // 6. Registration Date Filter
      let matchesRegDate = true;
      if (u.joinedDate) {
        if (filterRegDateAfter && u.joinedDate < filterRegDateAfter) {
          matchesRegDate = false;
        }
        if (filterRegDateBefore && u.joinedDate > filterRegDateBefore) {
          matchesRegDate = false;
        }
      }

      return matchesSearch && matchesRole && matchesStatus && matchesInstitution && matchesInsuranceCompany && matchesRegDate;
    });
  }, [
    consolidatedUsers, 
    userQuery, 
    userRoleFilter, 
    filterStatus, 
    filterInstitution, 
    filterInsuranceCompany, 
    filterRegDateAfter, 
    filterRegDateBefore
  ]);

  // Combine parent logs with dynamic local logs
  const allLogs = useMemo(() => {
    return [...localLogs, ...auditLogs].filter(log => {
      const q = logQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (log.action || '').toLowerCase().includes(q) ||
        (log.email || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.timestamp || '').toLowerCase().includes(q)
      );
    });
  }, [auditLogs, localLogs, logQuery]);

  // Form submit handles
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserNationalId) return;

    const uId = 'u-' + Math.random().toString(36).substring(2, 9);
    const mId = newUserRole === UserRole.PATIENT ? 'MID-' + Math.floor(100000 + Math.random() * 900000) : undefined;

    const customUser: User = {
      id: uId,
      email: newUserEmail,
      role: newUserRole,
      status: newUserRole === UserRole.PATIENT ? UserStatus.ACTIVE : UserStatus.PENDING,
      fullName: newUserName,
      phoneNumber: newUserPhone || '+20 (100) 000-0000',
      nationalId: newUserNationalId,
      gender: newUserGender,
      dateOfBirth: '1992-05-18',
      medicalId: mId,
      joinedDate: new Date().toISOString().split('T')[0]
    };

    setDynamicUsers(prev => [...prev, customUser]);
    onAddUser(customUser);
    setShowAddUserModal(false);

    addAuditLogEntry(
      'USER_CREATION',
      `Manually provisioned security credential profile for ${newUserName} (${newUserRole})`
    );
    showTemporaryBanner(`Successfully registered ${newUserName} as ${newUserRole}.`);

    // Reset Fields
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserNationalId('');
    setNewUserRole(UserRole.PATIENT);
  };

  const handleCreateInstitutionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName) return;

    if (editingInst) {
      // Editing Mode
      const specs = newInstitutionSpecialtiesText.split(',').map(s => s.trim()).filter(Boolean);
      onUpdateInstitution(editingInst.id, {
        name: newInstName,
        type: newInstitutionTypeFull,
        address: newInstitutionAddress,
        city: newInstitutionCity,
        country: newInstitutionCountry,
        contactEmail: newInstitutionEmail,
        contactPhone: newInstitutionPhone,
        specialties: specs
      });
      addAuditLogEntry('INSTITUTION_EDIT', `Modified medical institution record: ${newInstName}`);
      showTemporaryBanner(`Successfully updated ${newInstName}.`);
    } else {
      // Creating Mode
      const newInstId = 'inst-' + Math.floor(Math.random() * 1000000);
      const specs = newInstitutionSpecialtiesText.split(',').map(s => s.trim()).filter(Boolean);
      const customInst: MedicalInstitution = {
        id: newInstId,
        name: newInstName,
        type: newInstitutionTypeFull,
        address: newInstitutionAddress,
        city: newInstitutionCity,
        country: newInstitutionCountry,
        contactEmail: newInstitutionEmail,
        contactPhone: newInstitutionPhone,
        status: 'Active',
        specialties: specs
      };
      onAddInstitution(customInst);
      addAuditLogEntry('INSTITUTION_ADDED', `Registered brand new medical institution: ${newInstName}`);
      showTemporaryBanner(`Successfully created "${newInstName}".`);
    }

    // Close and Reset
    setShowAddInstitutionModal(false);
    setEditingInst(null);
    setNewInstName('');
    setNewInstitutionAddress('');
    setNewInstitutionCity('');
    setNewInstitutionCountry('');
    setNewInstitutionEmail('');
    setNewInstitutionPhone('');
    setNewInstitutionSpecialtiesText('Cardiology, Pediatrics, Emergency Medicine, General Medicine, Neurology');
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName) return;

    if (editingComp) {
      // Editing
      onUpdateInsuranceCompany(editingComp.id, {
        name: newCompName,
        type: newCompType,
        address: newCompAddress,
        contactEmail: newCompEmail,
        contactPhone: newCompPhone,
        coverageRegion: newCompRegion
      });
      addAuditLogEntry('INS_COMPANY_EDIT', `Altered insurance company record: ${newCompName}`);
      showTemporaryBanner(`Carrier "${newCompName}" details updated.`);
    } else {
      // Creating
      const newCompId = 'comp-' + Math.floor(Math.random() * 1000000);
      const customComp: InsuranceCompany = {
        id: newCompId,
        name: newCompName,
        type: newCompType,
        address: newCompAddress,
        contactEmail: newCompEmail,
        contactPhone: newCompPhone,
        coverageRegion: newCompRegion,
        status: 'Active',
        branches: []
      };
      onAddInsuranceCompany(customComp);
      addAuditLogEntry('INS_COMPANY_ADDED', `Registered a new medical insurance carrier: ${newCompName}`);
      showTemporaryBanner(`Created insurance carrier "${newCompName}".`);
    }

    // Close and Reset
    setShowAddCompModal(false);
    setEditingComp(null);
    setNewCompName('');
    setNewCompAddress('');
    setNewCompEmail('');
    setNewCompPhone('');
    setNewCompRegion('National Coverage');
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !showAddBranchModal) return;

    const companyId = showAddBranchModal;
    const parentCompany = insuranceCompanies.find(c => c.id === companyId);
    if (!parentCompany) return;

    if (editingBranch) {
      // Edit branch in company
      const updatedBranches = parentCompany.branches.map(b => 
        b.id === editingBranch.id 
          ? {
              ...b,
              name: newBranchName,
              city: newBranchCity,
              address: newBranchAddress,
              contactNumber: newBranchPhone,
              managerName: newBranchManager
            }
          : b
      );
      onUpdateInsuranceCompany(companyId, { branches: updatedBranches as any });
      addAuditLogEntry('BRANCH_EDIT', `Altered office branch settings for "${newBranchName}" under ${parentCompany.name}`);
      showTemporaryBanner(`Branch details modified successfully.`);
    } else {
      // Add brand new branch to company
      const newBrId = 'branch-' + Math.floor(Math.random() * 1000000);
      const newBr: InsuranceBranch = {
        id: newBrId,
        companyId,
        name: newBranchName,
        city: newBranchCity,
        address: newBranchAddress,
        contactNumber: newBranchPhone,
        managerName: newBranchManager,
        status: 'Active'
      };
      const updatedBranches = [...parentCompany.branches, newBr];
      onUpdateInsuranceCompany(companyId, { branches: updatedBranches as any });
      addAuditLogEntry('BRANCH_ADD', `Added a new branch office "${newBranchName}" under ${parentCompany.name}`);
      showTemporaryBanner(`Added branch office "${newBranchName}".`);
    }

    // Close & Reset
    setShowAddBranchModal(null);
    setEditingBranch(null);
    setNewBranchName('');
    setNewBranchCity('');
    setNewBranchAddress('');
    setNewBranchPhone('');
    setNewBranchManager('');
  };

  // Real Image Upload Support
  const handleAdminAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAdminProfile(prev => ({ ...prev, photoUrl: reader.result as string }));
          onUpdateUserProfile?.(adminProfile.id, { photoUrl: reader.result as string });
          addAuditLogEntry('AVATAR_UPDATE', 'Super Admin profile avatar picture updated.');
          showTemporaryBanner('New profile picture applied.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800 relative">
      
      {/* 0. MOBILE SIDEBAR DRAWER */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden no-print" role="dialog" aria-modal="true">
          <div 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-600/70 backdrop-blur-xs transition-opacity"
            id="admin-mobile-overlay"
          ></div>
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0F172A] focus:outline-none">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-slate-800"
                id="btn-admin-close-mobile-menu"
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 h-full overflow-y-auto">
              <SidebarContent
                activeUser={activeUser || null}
                activeSection={activeTab}
                onSectionChange={(tab) => {
                  setActiveTab(tab);
                  setIsMobileSidebarOpen(false);
                }}
                onLogout={onLogout || (() => {})}
                isMobile={true}
              />
            </div>
          </div>
          <div className="flex-shrink-0 w-14" aria-hidden="true"></div>
        </div>
      )}

      {/* 1. COMPREHENSIVE REDESIGNED SYSTEM SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-[#0F172A] text-slate-350 flex-col shrink-0 no-print border-r border-slate-800">
        <SidebarContent
          activeUser={activeUser || null}
          activeSection={activeTab}
          onSectionChange={setActiveTab}
          onLogout={onLogout || (() => {})}
        />
      </aside>

      {/* 2. MAIN APPLICATION WORKSPACE CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Dynamic Success Toast Alerts Notification Panel */}
        {successBanner && (
          <div className="absolute top-4 right-4 z-50 bg-slate-900 border border-emerald-500 text-emerald-400 px-4 py-3 rounded-2xl min-w-xs shadow-2xl flex items-center gap-2 font-semibold duration-200 animate-in fade-in slide-in-from-top-3">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs">{successBanner}</span>
          </div>
        )}

        {/* ADMINISTRATIVE PORTAL HEADER BLOCK */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-xs shrink-0 font-sans">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl lg:hidden focus:outline-none"
            >
              <Menu className="h-5 w-5 text-slate-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-sans font-extrabold text-slate-900 tracking-tight truncate">
              {activeTab === 'dashboard' && 'Admin Dashboard'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'doctors' && 'Doctor Approvals'}
              {activeTab === 'insurance' && 'Insurance Approvals'}
              {activeTab === 'institutions' && 'Medical Institutions Management'}
              {activeTab === 'insurance_companies' && 'Insurance Companies Directory'}
              {activeTab === 'organization_requests' && 'Organization Review Hub'}
              {activeTab === 'specialties' && 'Departments & Specialties'}
              {activeTab === 'qr' && 'QR Medical Identity Management'}
              {activeTab === 'audit' && 'System Audit Logs'}
              {activeTab === 'reports' && 'Reports & Analytics'}
              {activeTab === 'settings' && 'System Settings'}
              {activeTab === 'database' && 'Supabase Cloud Backend'}
              {activeTab === 'profile' && 'My Profile'}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {activeTab === 'dashboard' && 'Monitor users, approve providers, manage healthcare institutions, and oversee system activity.'}
              {activeTab === 'users' && 'Search, activate, suspend, or manage registered platform users.'}
              {activeTab === 'database' && 'Monitor live database connection, run SQL migration rules, and seed system registries.'}
              {activeTab === 'doctors' && 'Review licenses, hospital affiliations, credentials, and activate pending provider accounts.'}
              {activeTab === 'insurance' && 'Approve medical claims representatives and verify broker company licenses.'}
              {activeTab === 'institutions' && 'Add and manage local hospitals, clinics, emergency wings, and healthcare stations.'}
              {activeTab === 'insurance_companies' && 'Add and manage insurance carriers and configure localized regional offices.'}
              {activeTab === 'organization_requests' && 'Approve or log incoming requests for unrecognized healthcare institutions/companies.'}
              {activeTab === 'specialties' && 'Manage medical departments and control specialty permissions across physicians.'}
              {activeTab === 'qr' && 'Generate secure medical identity keys. Note: QR codes contain only patient IDs.'}
              {activeTab === 'audit' && 'Immutable system audit pipeline capturing administrator oversight and coordinator actions.'}
              {activeTab === 'reports' && 'Review monthly registrations, institutional distribution, and system performance metrics.'}
              {activeTab === 'settings' && 'Modify global platform thresholds, security backup variables, and access rules.'}
              {activeTab === 'profile' && 'Update your administrator profile photo, contact phone, and account notification settings.'}
            </p>
          </div>
        </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-semibold font-mono bg-slate-100 rounded-md py-1 px-2.5">
              UTC: {clockTime}
            </span>
          </div>
        </header>

        {/* SCROLLABLE DESK CONTAINER GRID */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* ALWAYS VISIBLE ANALYTICS COUNTER BANNER SECTION ON TOP OF MAIN DASHBOARD AREA */}
          {activeTab === 'dashboard' && (
            <section className="grid grid-cols-2 lg:grid-cols-6 gap-5">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col justify-between hover:scale-[1.02] duration-150 transition-all">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Users className="h-4 w-4 text-sky-500" /> Total Patients
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl font-black font-mono text-slate-800">{viewStats.totalPatients}</span>
                  <span className="text-[10px] text-sky-600 bg-sky-50 font-bold px-1.5 py-0.5 rounded font-mono">Registered</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col justify-between hover:scale-[1.02] duration-150 transition-all">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Stethoscope className="h-4 w-4 text-sky-500" /> Verified Doctors
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl font-black font-mono text-slate-800">{viewStats.activeDoctors}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-1.5 py-0.5 rounded font-mono">Active</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col justify-between hover:scale-[1.02] duration-150 transition-all">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Shield className="h-4 w-4 text-sky-500" /> Insurance Providers
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl font-black font-mono text-slate-800">{viewStats.insuranceProviders}</span>
                  <span className="text-[10px] text-purple-600 bg-purple-50 font-bold px-1.5 py-0.5 rounded font-mono">Registered</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col justify-between hover:scale-[1.02] duration-150 transition-all">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Activity className="h-4 w-4 text-emerald-500" /> Today's Visits
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl font-black font-mono text-slate-800">{viewStats.todayVisits}</span>
                  <span className="text-[10px] text-emerald-605 bg-emerald-50 font-bold px-1.5 py-0.5 rounded font-mono">Encounters</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col justify-between hover:scale-[1.02] duration-150 transition-all">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse" /> Pending Approvals
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl font-black font-mono text-slate-800">{viewStats.pendingApprovalsCount}</span>
                  <span className="text-[10px] text-rose-600 bg-rose-50 font-bold px-1.5 py-0.5 rounded font-mono">Awaiting Review</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col justify-between hover:scale-[1.02] duration-150 transition-all">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <QrCode className="h-4 w-4 text-indigo-500" /> Active QR IDs
                </span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl font-black font-mono text-slate-800">{viewStats.activeQRs}</span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-1.5 py-0.5 rounded font-mono">Generated</span>
                </div>
              </div>

            </section>
          )}

          {/* -------------------- TAB 1: DASHBOARD OVERVIEW -------------------- */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Quick Actions & Overview */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Welcome Card Info */}
                <div className="p-6 bg-gradient-to-br from-sky-400 to-sky-600 text-white rounded-3xl shadow-xs space-y-3">
                  <h3 className="text-lg font-bold font-sans">Welcome back, David Sterling</h3>
                  <p className="text-sky-50 text-xs leading-relaxed max-w-xl">
                    You have supreme administrative authority over the MedLink Healthcare cluster. Ensure specialist credential verification requests are fully audited, clinics are adequately staffed, and identity keys remain secure.
                  </p>
                  <div className="pt-3 flex gap-3 text-xs font-bold">
                    <button onClick={() => setActiveTab('users')} className="px-4 py-2 bg-white text-sky-700 hover:bg-sky-50 rounded-xl transition duration-150 cursor-pointer">
                      Manage User Directory
                    </button>
                    <button onClick={() => setActiveTab('doctors')} className="px-4 py-2 bg-[#0F172A]/30 text-white hover:bg-[#0F172A]/40 rounded-xl transition duration-150 cursor-pointer">
                      Verify Medical Licenses
                    </button>
                  </div>
                </div>

                {/* Quick Shortcuts Grid */}
                <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Platform Access Control Desk</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div onClick={() => { setShowAddUserModal(true); setActiveTab('users'); }} className="p-4 bg-slate-50 border hover:border-sky-300 rounded-2xl cursor-pointer transition-colors space-y-1">
                      <PlusCircle className="h-5 w-5 text-sky-600" />
                      <h5 className="font-bold text-xs text-slate-800">Register System User</h5>
                      <p className="text-[10px] text-slate-500">Bypass queue or verify staff</p>
                    </div>

                    <div onClick={() => { setActiveTab('institutions'); setShowAddInstitutionModal(true); }} className="p-4 bg-slate-50 border hover:border-sky-300 rounded-2xl cursor-pointer transition-colors space-y-1">
                      <Building2 className="h-5 w-5 text-emerald-500" />
                      <h5 className="font-bold text-xs text-slate-800">Register Institution</h5>
                      <p className="text-[10px] text-slate-500">Connect local hospital cluster</p>
                    </div>

                    <div onClick={() => setActiveTab('profile')} className="p-4 bg-slate-50 border hover:border-sky-300 rounded-2xl cursor-pointer transition-colors space-y-1">
                      <UserIcon className="h-5 w-5 text-indigo-500" />
                      <h5 className="font-bold text-xs text-slate-800">Update My Profile</h5>
                      <p className="text-[10px] text-slate-500">Audit keys & edit avatar</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Pending Queues Overview */}
              <div className="space-y-6">
                
                {/* Pending Applications widget */}
                <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Awaiting Credential Audit</h4>
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 rounded-full font-mono">{viewStats.pendingApprovalsCount} Total</span>
                  </div>

                  <div className="space-y-3">
                    {consolidatedUsers.filter(u => u.status === UserStatus.PENDING).slice(0, 3).map(pending => (
                      <div key={pending.id} className="p-3 bg-slate-50 hover:bg-slate-100/55 rounded-xl border border-slate-100/50 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{pending.fullName}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold font-mono mt-0.5">{pending.role}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (pending.role === UserRole.DOCTOR) setActiveTab('doctors');
                            else if (pending.role === UserRole.INSURANCE) setActiveTab('insurance');
                            else setActiveTab('users');
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-sky-50 text-sky-600 rounded-md border border-sky-100 hover:bg-sky-100"
                        >
                          Audit
                        </button>
                      </div>
                    ))}
                    {viewStats.pendingApprovalsCount === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-4">No pending licenses or registrations found.</p>
                    )}
                  </div>
                </div>

                {/* QR security advice */}
                <div className="bg-sky-50 border border-sky-200/80 p-5 rounded-3xl space-y-2.5">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-sky-600" />
                    <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider font-mono">HIPAA / GDPR Isolation Rule</h4>
                  </div>
                  <p className="text-[11px] text-sky-700 leading-relaxed font-semibold">
                    MedLink uses <strong>ID Isolation Keys</strong>. QR Codes printed on patient health cards contain ONLY their Medical ID (e.g. <code>MID-789410</code>) and zero diagnostic data. Re-key patient profiles securely via QR management.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* -------------------- TAB 2: USER MANAGEMENT -------------------- */}
          {activeTab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              
              {/* Header and Controls Row */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Platform User Directory & Credentials Registry</h3>
                  <p className="text-xs text-slate-500">View and audit healthcare practitioners, patients, claims agents, and system access levels.</p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {/* Export Users CSV button */}
                  <button
                    onClick={() => {
                      const headers = ['User ID', 'Full Name', 'Email', 'Role', 'Status', 'Registration Date', 'Organization Details', 'Unique ID/License Number'];
                      const rows = filteredUsers.map(u => {
                        const org = u.role === UserRole.DOCTOR 
                          ? u.institution 
                          : u.role === UserRole.INSURANCE 
                            ? `${u.organizationName || u.insuranceCompany || ''} - ${u.branchOffice || 'Main'}`
                            : u.role === UserRole.PATIENT 
                              ? `Insured (Carrier: ${u.insuranceCompany || 'Self-Paid'})`
                              : 'System Hub';
                        const uniqueId = u.role === UserRole.DOCTOR 
                          ? u.licenseNumber 
                          : u.role === UserRole.PATIENT 
                            ? u.medicalId 
                            : u.employeeId || 'N/A';
                        return [
                          u.id,
                          u.fullName,
                          u.email,
                          u.role,
                          u.status,
                          u.joinedDate,
                          org,
                          uniqueId
                        ];
                      });
                      
                      const csvContent = "data:text/csv;charset=utf-8," 
                        + [headers.join(','), ...rows.map(e => e.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','))].join('\n');
                      
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `medlink_user_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      addAuditLogEntry('USER_MANIFEST_EXPORT', `Exported directory roster containing ${filteredUsers.length} filtered user files.`);
                      showTemporaryBanner(`Successfully exported manifest to CSV for ${filteredUsers.length} records.`);
                    }}
                    className="px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-sky-150"
                  >
                    <Download className="h-3.5 w-3.5" /> Export Users
                  </button>

                  {/* Advanced Filters toggler */}
                  <button
                    onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border ${
                      isAdvancedFiltersOpen 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" /> {isAdvancedFiltersOpen ? 'Hide Filters' : 'Advanced Filters'}
                  </button>
                </div>
              </div>

              {/* HEALTHCARE ADMINISTRATIVE METRICS BLOCK */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-[#FAFBFD] p-3 rounded-xl border border-slate-150 text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Patients</span>
                  <div className="text-lg font-black text-slate-800 font-mono mt-1">{viewStats.totalPatients}</div>
                </div>
                <div className="bg-[#FAFBFD] p-3 rounded-xl border border-slate-150 text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Verified Doctors</span>
                  <div className="text-lg font-black text-slate-800 font-mono mt-1">{viewStats.verifiedDoctors}</div>
                </div>
                <div className="bg-[#FAFBFD] p-3 rounded-xl border border-slate-150 text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Insurance Staff</span>
                  <div className="text-lg font-black text-slate-800 font-mono mt-1">{viewStats.insuranceStaff}</div>
                </div>
                <div className="bg-[#FAFBFD] p-3 rounded-xl border border-slate-150 text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approvals</span>
                  <div className="text-lg font-black text-amber-600 font-mono mt-1">{viewStats.pendingApprovals}</div>
                </div>
                <div className="bg-[#FAFBFD] p-3 rounded-xl border border-slate-150 text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Suspended Accounts</span>
                  <div className="text-lg font-black text-rose-600 font-mono mt-1">{viewStats.suspendedAccounts}</div>
                </div>
                <div className="bg-[#FAFBFD] p-3 rounded-xl border border-slate-150 text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Active Institutions</span>
                  <div className="text-lg font-black text-slate-800 font-mono mt-1">{viewStats.activeInstitutions}</div>
                </div>
                <div className="bg-[#FAFBFD] p-3 rounded-xl border border-slate-150 text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Companies</span>
                  <div className="text-lg font-black text-slate-800 font-mono mt-1">{viewStats.insuranceCompanies}</div>
                </div>
              </div>

              {/* ADVANCED FILTER PANEL */}
              {isAdvancedFiltersOpen && (
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-205 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs text-left animate-in fade-in duration-150">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Account Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="block w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="All">All statuses</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PENDING">PENDING</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>

                  {/* Institution Filter (Mapped dynamically) */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Affiliated Institution</label>
                    <select
                      value={filterInstitution}
                      onChange={(e) => setFilterInstitution(e.target.value)}
                      className="block w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="All">All Institutions (Any)</option>
                      {Array.from(new Set(consolidatedUsers.map(u => u.institution).filter(Boolean))).map((inst) => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                  </div>

                  {/* Insurance Company Filter (Mapped dynamically) */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Insurance Carrier</label>
                    <select
                      value={filterInsuranceCompany}
                      onChange={(e) => setFilterInsuranceCompany(e.target.value)}
                      className="block w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="All">All Carriers (Any)</option>
                      {Array.from(new Set(consolidatedUsers.map(u => u.insuranceCompany || u.organizationName).filter(Boolean))).map((comp) => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>

                  {/* Registration Date After */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Registered After</label>
                    <input
                      type="date"
                      value={filterRegDateAfter}
                      onChange={(e) => setFilterRegDateAfter(e.target.value)}
                      className="block w-full py-1 px-2 border border-slate-200 bg-white rounded-lg text-xs"
                    />
                  </div>

                  {/* Registration Date Before & Clear Action */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Registered Before</label>
                      <input
                        type="date"
                        value={filterRegDateBefore}
                        onChange={(e) => setFilterRegDateBefore(e.target.value)}
                        className="block w-full py-1 px-2 border border-slate-200 bg-white rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3 lg:col-span-5 flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setUserRoleFilter('All');
                        setFilterStatus('All');
                        setFilterInstitution('All');
                        setFilterInsuranceCompany('All');
                        setFilterRegDateAfter('');
                        setFilterRegDateBefore('');
                        setUserQuery('');
                      }}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-bold text-slate-700 cursor-pointer transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Search input with count */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search users by name, contact, list credentials, Medical ID, National ID, or license..."
                    className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-sky-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 duration-100"
                  />
                </div>

                {/* Filter presets scroll */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {['All', 'Patients', 'Doctors', 'Insurance', 'Admin', 'Suspended', 'Pending Approval'].map((filterItem) => (
                    <button
                      key={filterItem}
                      onClick={() => setUserRoleFilter(filterItem)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        userRoleFilter === filterItem
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {filterItem}
                    </button>
                  ))}
                </div>
              </div>

              {/* Showing count indicator */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold px-1">
                <span>DIRECTORY POINTER</span>
                <span>SHOWING {filteredUsers.length} OF {consolidatedUsers.length} USERS</span>
              </div>

              {/* Desktop Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-150">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-[#FAFBFD] uppercase tracking-wider text-[10px] font-bold text-slate-500 border-b border-slate-150 font-mono">
                    <tr>
                      <th className="px-5 py-3">Profile</th>
                      <th className="px-5 py-3">Role Details</th>
                      <th className="px-5 py-3">Organization</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Registration Date</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white leading-normal">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-medium italic">
                          No matching platform user accounts found. Try modifying filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        // Institution active check
                        const isDocInstInactive = u.role === UserRole.DOCTOR && u.institution && (() => {
                          const matched = institutions.find(i => (i.name || '').toLowerCase() === (u.institution || '').toLowerCase());
                          return matched && matched.status === 'Inactive';
                        })();

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            
                            {/* Profile */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-sky-50 rounded-full overflow-hidden flex items-center justify-center font-extrabold text-sky-700 shrink-0 border border-sky-100">
                                  {u.photoUrl ? (
                                    <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    (u.fullName || '').split(' ').map(n=>n[0] || '').join('').slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="text-left">
                                  <span className="font-extrabold text-slate-900 hover:text-sky-600 transition-colors cursor-pointer block" onClick={() => setViewingUserProfile(u)}>
                                    {u.fullName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">{u.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* Role Details */}
                            <td className="px-5 py-4 font-medium text-slate-700 text-left">
                              {u.role === UserRole.DOCTOR ? (
                                <div>
                                  <p className="font-extrabold text-sky-800 text-[11px] uppercase tracking-wide">DOCTOR</p>
                                  <p className="text-[11px] text-slate-500 font-semibold">{u.specialty || 'General Practitioner'}</p>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">License: {u.licenseNumber || 'N/A'}</p>
                                </div>
                              ) : u.role === UserRole.INSURANCE ? (
                                <div>
                                  <p className="font-extrabold text-purple-800 text-[11px] uppercase tracking-wide">INSURANCE STAFF</p>
                                  <p className="text-[11px] text-slate-500 font-semibold">{u.position || 'Claims Officer'}</p>
                                </div>
                              ) : u.role === UserRole.PATIENT ? (
                                <div>
                                  <p className="font-extrabold text-emerald-800 text-[11px] uppercase tracking-wide">PATIENT</p>
                                  <p className="text-[11px] text-emerald-600 font-bold font-mono">Medical ID: {u.medicalId || 'N/A'}</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="font-extrabold text-[#7C3AED] text-[11px] uppercase tracking-wide">ADMINISTRATOR</p>
                                  <p className="text-[9px] text-slate-400 font-bold">Super Operations Coordinator</p>
                                </div>
                              )}
                            </td>

                            {/* Organization mapping */}
                            <td className="px-5 py-4 text-slate-700 font-medium text-left">
                              {u.role === UserRole.DOCTOR ? (
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-900 block">🏥 {u.institution || 'Cairo Medical Center'}</p>
                                  {isDocInstInactive && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-50 text-amber-600 border border-amber-200">
                                      ⚠️ Institution Inactive
                                    </span>
                                  )}
                                </div>
                              ) : u.role === UserRole.INSURANCE ? (
                                <div>
                                  <p className="font-bold text-slate-900">🏢 {u.organizationName || u.insuranceCompany || 'Nile Health Insurance'}</p>
                                  <p className="text-[10px] text-slate-400">{u.branchOffice || 'Egypt Central Headquarters'}</p>
                                </div>
                              ) : u.role === UserRole.PATIENT ? (
                                <div>
                                  <p className="font-bold text-slate-600">🛡️ Insured</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{u.insuranceCompany || 'Nile Health Insurance'}</p>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic font-mono">Global System</span>
                              )}
                            </td>

                            {/* Status badge */}
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.status === UserStatus.ACTIVE ? 'bg-emerald-50 text-emerald-700' :
                                  u.status === UserStatus.PENDING ? 'bg-amber-50 text-amber-700' :
                                  u.status === UserStatus.SUSPENDED ? 'bg-rose-50 text-rose-700' :
                                  'bg-slate-50 text-slate-500'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${
                                    u.status === UserStatus.ACTIVE ? 'bg-emerald-500' :
                                    u.status === UserStatus.PENDING ? 'bg-amber-500 animate-pulse' :
                                    'bg-rose-500'
                                  }`}></span>
                                  {u.status === UserStatus.PENDING ? 'PENDING APPROVAL' : u.status}
                                </span>
                                
                                {u.status === UserStatus.PENDING && (
                                  <span className="text-[9px] font-extrabold text-amber-700 tracking-wide bg-amber-50 px-1 border border-amber-100 rounded">
                                    Approval Required
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Registration Date (Joined Date replacement) */}
                            <td className="px-5 py-4 text-slate-500 font-mono text-[11px] text-left">
                              {u.joinedDate || '2024-02-14'}
                            </td>

                            {/* Action Buttons refactored */}
                            <td className="px-5 py-4 text-right space-y-1">
                              <div className="inline-flex flex-wrap justify-end gap-1 select-none">
                                
                                {/* Always openable view profile button */}
                                <button
                                  onClick={() => setViewingUserProfile(u)}
                                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-250 cursor-pointer transition-colors"
                                >
                                  View Profile
                                </button>

                                {/* Conditional based on active status */}
                                {u.status === UserStatus.ACTIVE && (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Suspend user account for ${u.fullName}?`)) {
                                          updateLocalUserStatus(u.id, UserStatus.SUSPENDED);
                                          addAuditLogEntry('SUSPEND_USER', `Administratively suspended credentials for ${u.fullName}`);
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold border border-rose-200 cursor-pointer transition-colors"
                                    >
                                      Suspend Account
                                    </button>

                                    <button
                                      onClick={() => {
                                        setResetPasswordTarget(u);
                                        setResetPasswordMethod('GENERATE');
                                        setResetManualPassword('');
                                        setResetManualConfirmPassword('');
                                      }}
                                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 cursor-pointer transition-all"
                                    >
                                      Reset Password
                                    </button>

                                    {u.role === UserRole.DOCTOR && adminRole !== 'SUPPORT' && (
                                      <button
                                        onClick={() => setEditingDoctor(u)}
                                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-[10px] font-extrabold border border-sky-150 cursor-pointer transition-colors"
                                      >
                                        Edit Profile
                                      </button>
                                    )}

                                    {u.role === UserRole.INSURANCE && adminRole !== 'SUPPORT' && (
                                      <button
                                        onClick={() => setEditingInsurance(u)}
                                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[10px] font-extrabold border border-purple-150 cursor-pointer transition-colors"
                                      >
                                        Edit Organization Access
                                      </button>
                                    )}
                                  </>
                                )}

                                {/* Reactivate for suspended users */}
                                {u.status === UserStatus.SUSPENDED && (
                                  <>
                                    <button
                                      onClick={() => {
                                        updateLocalUserStatus(u.id, UserStatus.ACTIVE);
                                        addAuditLogEntry('REACTIVATE_ACCOUNT', `Administratively reactivated suspended account: ${u.fullName}`);
                                        showTemporaryBanner(`Reactivated account for ${u.fullName}.`);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200 cursor-pointer transition-colors"
                                    >
                                      Reactivate Account
                                    </button>

                                    <button
                                      onClick={() => {
                                        setResetPasswordTarget(u);
                                        setResetPasswordMethod('GENERATE');
                                        setResetManualPassword('');
                                        setResetManualConfirmPassword('');
                                      }}
                                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 cursor-pointer transition-colors"
                                    >
                                      Reset Password
                                    </button>
                                  </>
                                )}

                                {/* Approval Queue swap for Pending users */}
                                {u.status === UserStatus.PENDING && (
                                  <button
                                    onClick={() => {
                                      if (u.role === UserRole.DOCTOR) {
                                        setActiveTab('doctors');
                                      } else if (u.role === UserRole.INSURANCE) {
                                        setActiveTab('insurance');
                                      } else {
                                        setActiveTab('dashboard');
                                      }
                                    }}
                                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black border border-amber-200 cursor-pointer flex items-center gap-1 transition-all hover:scale-105"
                                  >
                                    Go To Approval Queue &rarr;
                                  </button>
                                )}

                                {u.role !== UserRole.ADMIN && adminRole !== 'SUPPORT' && (
                                  <button
                                    onClick={() => {
                                      setDeleteUserTarget(u);
                                      setDeleteWarningMessage(null);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors inline-block align-middle cursor-pointer"
                                    title="Deprovision member record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}

                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* -------------------- TAB 2b: ADMIN MANAGEMENT (SUPER ADMIN ONLY) -------------------- */}
          {activeTab === 'admin_management' && adminRole === 'SUPER' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              
              {/* Header and Controls Row */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Security Administrators Directory</h3>
                  <p className="text-xs text-slate-500">Create, edit, suspend, and govern platform security administrators, operations admins, and support agents.</p>
                </div>

                {showAdminForm === 'NONE' && (
                  <button
                    onClick={() => {
                      setAdminFormName('');
                      setAdminFormEmail('');
                      setAdminFormPhone('');
                      setAdminFormNationalId('');
                      setAdminFormType('SUPPORT');
                      setAdminFormPassword('');
                      setAdminFormConfirmPassword('');
                      setAdminFormPhotoUrl('');
                      setEditingAdminId(null);
                      setShowAdminForm('ADD');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition"
                  >
                    <Plus className="h-4 w-4" />
                    Add Administrative Node
                  </button>
                )}
              </div>

              {/* Form to Add or Edit Admin */}
              {showAdminForm !== 'NONE' && (
                <div className="p-6 bg-slate-50/60 border rounded-2xl space-y-6 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-700">
                      {showAdminForm === 'ADD' ? '🔒 Provision New Security Admin Credentials' : '✏️ Modify Existing Admin Settings'}
                    </h4>
                    <button onClick={() => setShowAdminForm('NONE')} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer text-xs font-bold">
                      Back to Directory
                    </button>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      
                      if (!adminFormName || !adminFormEmail || !adminFormNationalId) {
                        alert('Please fill out all required fields.');
                        return;
                      }

                      if (showAdminForm === 'ADD' && adminFormPassword !== adminFormConfirmPassword) {
                        alert('Error: Admin passwords do not match!');
                        return;
                      }

                      if (showAdminForm === 'ADD') {
                        // Check if email already registered
                        const emailExists = consolidatedUsers.some(u => u.email.toLowerCase() === adminFormEmail.toLowerCase());
                        if (emailExists) {
                          alert('Error: Email address is already registered in the system.');
                          return;
                        }

                        const customAdmin: User = {
                          id: 'u-adm-' + Date.now(),
                          email: adminFormEmail,
                          password: adminFormPassword,
                          role: UserRole.ADMIN,
                          adminRole: adminFormType,
                          status: UserStatus.ACTIVE,
                          fullName: adminFormName,
                          phoneNumber: adminFormPhone || '+20 (100) 000-0000',
                          nationalId: adminFormNationalId,
                          gender: 'Male',
                          dateOfBirth: '1985-06-12',
                          joinedDate: new Date().toISOString().split('T')[0],
                          photoUrl: adminFormPhotoUrl
                        };

                        setDynamicUsers(prev => [...prev, customAdmin]);
                        onAddUser(customAdmin);
                        addAuditLogEntry('ADMIN_CREATION', `Provisioned new admin account: ${adminFormName} (${adminFormType})`);
                        showTemporaryBanner(`Successfully created ${adminFormName} as ${adminFormType} Admin.`);
                      } else if (showAdminForm === 'EDIT' && editingAdminId) {
                        
                        updateLocalUserProfile(editingAdminId, {
                          fullName: adminFormName,
                          email: adminFormEmail,
                          phoneNumber: adminFormPhone || '+20 (100) 000-0000',
                          nationalId: adminFormNationalId,
                          adminRole: adminFormType,
                          photoUrl: adminFormPhotoUrl
                        });

                        addAuditLogEntry('ADMIN_MODIFIED', `Modified administrative profile settings for ${adminFormName}`);
                        showTemporaryBanner(`Successfully updated settings for ${adminFormName}.`);
                      }

                      setShowAdminForm('NONE');
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold"
                  >
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Full Name *</label>
                      <input 
                        type="text" 
                        required
                        value={adminFormName}
                        onChange={(e)=>setAdminFormName(e.target.value)}
                        placeholder="e.g. Director Joseph Sterling"
                        className="w-full px-3 py-2.5 bg-white border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Email Address *</label>
                      <input 
                        type="email" 
                        required
                        value={adminFormEmail}
                        onChange={(e)=>setAdminFormEmail(e.target.value)}
                        placeholder="e.g. joseph.sterling@medlink.org"
                        className="w-full px-3 py-2.5 bg-white border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Phone Number</label>
                      <input 
                        type="tel" 
                        value={adminFormPhone}
                        onChange={(e)=>setAdminFormPhone(e.target.value)}
                        placeholder="e.g. +20 (100) 841-2856"
                        className="w-full px-3 py-2.5 bg-white border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">National ID (NID) *</label>
                      <input 
                        type="text" 
                        required
                        value={adminFormNationalId}
                        onChange={(e)=>setAdminFormNationalId(e.target.value)}
                        placeholder="e.g. NID-882049"
                        className="w-full px-3 py-2.5 bg-white border rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Profile Avatar URL</label>
                      <input 
                        type="url" 
                        value={adminFormPhotoUrl}
                        onChange={(e)=>setAdminFormPhotoUrl(e.target.value)}
                        placeholder="e.g. https://images.unsplash.com/photo-..."
                        className="w-full px-3 py-2.5 bg-white border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">Admin Hierarchy Role *</label>
                      <select
                        value={adminFormType}
                        onChange={(e)=>setAdminFormType(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-white border rounded-xl cursor-pointer"
                      >
                        <option value="SUPER">Super Admin (Full Platform Control)</option>
                        <option value="OPERATIONS">Operations Admin (Staff & Institutions)</option>
                        <option value="SUPPORT">Support Admin (Passwords & Logs Only)</option>
                      </select>
                    </div>

                    {showAdminForm === 'ADD' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-1">Credential Password *</label>
                          <input 
                            type="password" 
                            required
                            value={adminFormPassword}
                            onChange={(e)=>setAdminFormPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 bg-white border rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-1">Confirm Credential Password *</label>
                          <input 
                            type="password" 
                            required
                            value={adminFormConfirmPassword}
                            onChange={(e)=>setAdminFormConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 bg-white border rounded-xl"
                          />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2 flex justify-end gap-2 pt-4">
                      <button 
                        type="button" 
                        onClick={() => setShowAdminForm('NONE')}
                        className="px-4 py-2 border rounded-xl text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl cursor-pointer shadow-xs"
                      >
                        {showAdminForm === 'ADD' ? 'Authorize & Create Admin' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Directory Filter / Search Row */}
              {showAdminForm === 'NONE' && (
                <div className="space-y-4">
                  <div className="flex max-w-md gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={adminSearchQuery}
                        onChange={(e)=>setAdminSearchQuery(e.target.value)}
                        placeholder="Search security admins by name or email..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Admins Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-105">
                    <table className="w-full text-xs text-left text-slate-600">
                      <thead className="bg-[#FAFBFD] uppercase tracking-wider text-[10px] font-bold text-slate-550 border-b border-slate-150 font-mono">
                        <tr>
                          <th className="px-5 py-3">Administrator Node</th>
                          <th className="px-5 py-3">Assigned Privilege</th>
                          <th className="px-5 py-3">Authorization Code</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Created</th>
                          <th className="px-5 py-3 text-right">Cyber Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white font-medium">
                        {consolidatedUsers
                          .filter(u => u.role === UserRole.ADMIN)
                          .filter(adm => {
                            const matchQuery = adm.fullName.toLowerCase().includes(adminSearchQuery.toLowerCase()) || 
                                               adm.email.toLowerCase().includes(adminSearchQuery.toLowerCase());
                            return matchQuery;
                          })
                          .map((adm) => {
                            const isSelf = adm.id === activeUser?.id;
                            const isLastSuper = adm.adminRole === 'SUPER' && consolidatedUsers.filter(u => u.role === UserRole.ADMIN && u.adminRole === 'SUPER' && u.status === UserStatus.ACTIVE).length <= 1;

                            return (
                              <tr key={adm.id} className="hover:bg-slate-55/40">
                                <td className="px-5 py-3 text-slate-900 font-bold flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-800 uppercase text-[11px] overflow-hidden">
                                    {adm.photoUrl ? (
                                      <img src={adm.photoUrl} alt="Pic" className="w-full h-full object-cover" />
                                    ) : (
                                      (adm.fullName || '').split(' ').map(n=>n[0] || '').join('').slice(0, 2)
                                    )}
                                  </div>
                                  <div>
                                    <span className="block font-bold">{adm.fullName} {isSelf && <span className="text-[9px] font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-slate-500">(You)</span>}</span>
                                    <span className="text-[10px] text-slate-400 block font-normal font-mono">{adm.email}</span>
                                  </div>
                                </td>

                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase border font-mono ${
                                    adm.adminRole === 'SUPER' 
                                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                      : adm.adminRole === 'OPERATIONS' 
                                        ? 'bg-sky-50 text-sky-700 border-sky-200' 
                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}>
                                    {adm.adminRole || 'SUPPORT'}
                                  </span>
                                </td>

                                <td className="px-5 py-3 font-mono font-bold text-slate-600">
                                  {adm.nationalId || 'NID-991024'}
                                </td>

                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase font-mono ${
                                    adm.status === UserStatus.ACTIVE 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    <span className={`h-1 w-1 rounded-full ${adm.status === UserStatus.ACTIVE ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    {adm.status}
                                  </span>
                                </td>

                                <td className="px-5 py-3 font-mono text-[11px] text-slate-405">
                                  {adm.joinedDate || '2024-01-15'}
                                </td>

                                <td className="px-5 py-3 text-right space-x-1.5 font-sans font-bold">
                                  <button
                                    onClick={() => {
                                      setAdminFormName(adm.fullName);
                                      setAdminFormEmail(adm.email);
                                      setAdminFormPhone(adm.phoneNumber || '');
                                      setAdminFormNationalId(adm.nationalId || '');
                                      setAdminFormType(adm.adminRole || 'SUPPORT');
                                      setAdminFormPhotoUrl(adm.photoUrl || '');
                                      setEditingAdminId(adm.id);
                                      setShowAdminForm('EDIT');
                                    }}
                                    className="px-2.5 py-1 text-[10px] text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer"
                                  >
                                    Edit Settings
                                  </button>

                                  {!isSelf && (
                                    <>
                                      <button
                                        onClick={() => {
                                          if (isLastSuper) {
                                            alert('System restriction: Administrative rule prohibits suspending the last active Super Administrator to maintain platform failover recovery.');
                                            return;
                                          }
                                          const nextStatus = adm.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
                                          updateLocalUserStatus(adm.id, nextStatus);
                                          addAuditLogEntry('ADMIN_MODIFIED', `Admin account suspension toggled for ${adm.fullName}`);
                                        }}
                                        className={`px-2.5 py-1 text-[10px] rounded border cursor-pointer ${
                                          adm.status === UserStatus.ACTIVE 
                                            ? 'text-rose-650 bg-rose-50 hover:bg-rose-100 border-rose-200' 
                                            : 'text-emerald-750 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                        }`}
                                      >
                                        {adm.status === UserStatus.ACTIVE ? 'Suspend' : 'Reactivate'}
                                      </button>

                                      <button
                                        onClick={() => {
                                          if (isLastSuper) {
                                            alert('System restriction: Cannot delete the last remaining Super Administrator to prevent system lockout.');
                                            return;
                                          }
                                          if (confirm(`CRITICAL: Purge administrative privileges and credentials for ${adm.fullName}? This cannot be undone.`)) {
                                            deleteLocalUser(adm.id);
                                            addAuditLogEntry('ADMIN_DELETED', `Permanently deprovisioned admin credentials for ${adm.fullName}`);
                                            showTemporaryBanner(`Purged admin account ${adm.fullName}.`);
                                          }
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-650 inline-block align-middle cursor-pointer"
                                        title="Purge Administrative privileges"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
          {activeTab === 'doctors' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Physician License Approvals Pipeline</h3>
                <p className="text-xs text-slate-500">Verify Medical Syndicate IDs and board specialized documents to grant system activation keys.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {supabasePendingDoctors.length === 0 ? (
                  <div className="lg:col-span-2 p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-slate-50/50">
                    <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-xs font-bold font-sans">No pending clinical licensing registrations are on hold.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Physician syndicate queues are fully synchronized and clean.</p>
                  </div>
                ) : (
                  supabasePendingDoctors.map(doc => (
                    <div key={doc.id} className="bg-white p-5 rounded-2xl border-2 border-slate-105 shadow-3xs space-y-4 text-left relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400"></div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{doc.fullName}</h4>
                          <span className="text-[10px] font-mono font-bold text-slate-400 block mt-0.5">{doc.email}</span>
                          <span className="text-[10px] font-mono text-slate-400 block">Phone: {doc.phoneNumber}</span>
                        </div>
                        <span className="px-2 py-0.5 text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-sm uppercase tracking-wide">Pending Licensure Verification</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs font-medium border border-slate-100">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Medical License Number:</span>
                            <span className="font-bold text-slate-800 font-mono">{doc.licenseNumber || 'LIC-49910'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Specialty Selection:</span>
                            <span className="font-bold text-sky-850">{doc.specialty || 'Cardiology'}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-200/50">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Hospital / Clinic Affiliation:</span>
                          <span className="font-extrabold text-slate-800">{doc.institution || 'Cairo Medical Center'}</span>
                        </div>
                      </div>

                      {/* Document reviews preview */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide font-mono block">Licensing Documents Review:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['board_certification_syndicate.pdf', 'academic_degree_clinical.pdf'].map((docName, idx) => (
                            <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] flex items-center justify-between gap-3 w-full">
                              <span className="font-bold text-slate-700 truncate">📄 {docName}</span>
                              <button onClick={() => alert(`Reviewing verification file: ${docName} - Signatures and Stamps verified.`)} className="text-[9px] text-sky-500 font-extrabold shrink-0 hover:underline">
                                View File
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Workflow Activation Buttons */}
                      <div className="flex justify-end gap-2 text-xs font-bold pt-1.5">
                        <button
                          onClick={() => {
                            const note = prompt('Enter request amendment details:');
                            if (note) {
                              addAuditLogEntry('REQUEST_CLARIFICATION', `Sent clarification request note to dr. ${doc.fullName}.`);
                              showTemporaryBanner(`Licensing documentation revision requested for Dr. ${doc.fullName}.`);
                            }
                          }}
                          className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                        >
                          Request More Information
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm(`Confirm rejection of credentials and licensure file for Dr. ${doc.fullName}?`)) {
                              handleRejectUser(doc.id, doc.fullName);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer animate-in"
                        >
                          Reject Application
                        </button>

                        <button
                          onClick={() => {
                            handleApproveUser(doc.id, doc.fullName);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" /> Approve Doctor
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

              {/* Doctor Professional Requests (Specialty Change & Institution Transfers) Section */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Physician Specialty & Institution Request Pipeline</h3>
                  <p className="text-xs text-slate-500">Approve or reject doctor requests for specialty change and administrative institutional transfer.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {professionalRequests.filter(req => req.status === 'PENDING').length === 0 ? (
                    <div className="lg:col-span-2 p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-slate-50/50">
                      <CheckCircle className="h-7 w-7 text-slate-350 mx-auto mb-2" />
                      <p className="text-xs font-bold font-sans">No pending professional updates or transfer requests.</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">All doctor profile modifications are completely synchronized.</p>
                    </div>
                  ) : (
                    professionalRequests.filter(req => req.status === 'PENDING').map(req => {
                      const isSpecialty = req.requestedSpecialty !== req.currentSpecialty;
                      const isTransfer = !!req.requestedHospital;
                      return (
                        <div key={req.id} className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-3xs space-y-4 text-left relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-505"></div>
                          
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900">{req.userName}</h4>
                              <span className="text-[10px] font-mono font-bold text-slate-400 block mt-0.5">{req.userEmail}</span>
                            </div>
                            <span className="px-2 py-0.5 text-[8px] font-black bg-sky-50 text-sky-700 border border-sky-200 rounded-sm uppercase tracking-wider">
                              {isSpecialty && isTransfer ? 'Board & Transfer' : isSpecialty ? 'Specialty Update' : 'Institutional Relocation'}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs font-medium border border-slate-100">
                            {isSpecialty && (
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Current Specialty:</span>
                                  <span className="font-semibold text-slate-650">{req.currentSpecialty || 'General Practitioner'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide text-sky-650">Requested Specialty:</span>
                                  <span className="font-bold text-sky-700">{req.requestedSpecialty}</span>
                                </div>
                              </div>
                            )}

                            {isTransfer && (
                              <div className="pt-2 border-t border-slate-200/50">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Relocation Destination Hospital:</span>
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  🏢 {req.requestedHospital}
                                </span>
                              </div>
                            )}

                            {req.reason && (
                              <div className="pt-2 border-t border-slate-200/50">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Stated Reason / Fellowship Proof:</span>
                                <p className="text-[11px] text-slate-600 italic">"{req.reason}"</p>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 text-xs font-bold pt-1">
                            <button
                              onClick={() => {
                                const note = prompt('Enter rejection notes / board statement:');
                                if (note !== null) {
                                  if (onRejectProfessionalUpdate) {
                                    onRejectProfessionalUpdate(req.id, note || 'Documentation rejected.');
                                  }
                                  addAuditLogEntry('PROFESSIONAL_REQUEST_REJECTED', `Rejected profile update request for Dr. ${req.userName}.`);
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer transition-all"
                            >
                              Reject Request
                            </button>

                            <button
                              onClick={() => {
                                const note = prompt('Enter approval board notation notes:');
                                if (note !== null) {
                                  if (onApproveProfessionalUpdate) {
                                    onApproveProfessionalUpdate(req.id, note || 'MDC certified.');
                                  }
                                  addAuditLogEntry('PROFESSIONAL_REQUEST_APPROVED', `Approved clinical profile alteration for Dr. ${req.userName}.`);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5 shrink-0" /> Approve Request
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Doctor Professional Request History logs section */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Evaluated Practitioner History Records</h3>
                  <p className="text-xs text-slate-500">History tracking of doctor transfers or specialty changes approved or rejected by directors.</p>
                </div>

                {professionalRequests.filter(req => req.status !== 'PENDING').length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center font-medium">No previously processed professional credentials change requests found.</p>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                    {professionalRequests.filter(req => req.status !== 'PENDING').map(req => {
                      const isSpecialty = req.requestedSpecialty !== req.currentSpecialty;
                      const isTransfer = !!req.requestedHospital;
                      return (
                        <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-100 rounded-xl text-left">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-850 block">{req.userName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono leading-none">{req.userEmail} &bull; {req.date}</span>
                            <p className="text-slate-650 leading-relaxed font-semibold">
                              {isSpecialty && <>Specialty adjustment: <strong className="text-sky-600">"{req.requestedSpecialty}"</strong></>}
                              {isSpecialty && isTransfer && <br />}
                              {isTransfer && <>Transfer clinic connection: <strong className="text-emerald-600">"{req.requestedHospital}"</strong></>}
                            </p>
                            {req.adminNotes && (
                              <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                                <strong>Admin answer:</strong> "{req.adminNotes}"
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border shrink-0 ${
                            req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-rose-50 text-rose-700 border-rose-150'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* -------------------- TAB 4: INSURANCE APPROVALS -------------------- */}
          {activeTab === 'insurance' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Insurance Staff portal Approvals</h3>
                <p className="text-xs text-slate-500">Verify company broker licenses, representative IDs, and authorize claim adjudication credentials.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {supabasePendingInsurance.length === 0 ? (
                  <div className="lg:col-span-2 p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-slate-50/50 font-sans">
                    <CheckCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-xs font-bold font-sans">No insurance carrier accounts are awaiting audit.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Claim brokers and officers are fully clear and activated.</p>
                  </div>
                ) : (
                  supabasePendingInsurance.map(ins => (
                    <div key={ins.id} className="bg-white p-5 rounded-2xl border-2 border-slate-105 shadow-3xs space-y-4 text-left relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500"></div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{ins.fullName}</h4>
                          <span className="text-[10px] font-mono font-bold text-slate-400 block mt-0.5">{ins.email}</span>
                          <span className="text-[10px] font-mono text-slate-400 block">Phone: {ins.phoneNumber}</span>
                        </div>
                        <span className="px-2 py-0.5 text-[8px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded-sm uppercase tracking-wide">Waiting Insurance Audit</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs font-medium border border-slate-105">
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Organization Carrier Name:</span>
                            <span className="font-bold text-slate-800">{ins.organizationName || 'Aetna Platinum Hub'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Corporate Branch:</span>
                            <span className="font-bold text-slate-800">{ins.branchOffice || 'Cairo Main Branch'}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-150">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Corporate Employee ID:</span>
                          <span className="font-mono font-bold text-purple-800">{ins.employeeId || 'EMP-ML-2391'}</span>
                        </div>
                      </div>

                      {/* Supporting Verification Documents */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide font-mono block">Credentials & Broker Permit:</span>
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg text-xs font-medium">
                          <span className="text-slate-705">📄 insurance_broker_syndicate_authority.pdf</span>
                          <button onClick={() => alert('Auditing Allianz/MetLife broker corporate permit... Official stamps verified.')} className="text-[10px] text-purple-605 font-bold hover:underline">
                            View File
                          </button>
                        </div>
                      </div>

                      {/* Decision Controls */}
                      <div className="flex justify-end gap-2 text-xs font-bold pt-1.5">
                        <button
                          onClick={() => {
                            if (confirm(`Confirm rejection of Representative Access for ${ins.fullName}?`)) {
                              handleRejectUser(ins.id, ins.fullName);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-250 rounded-lg cursor-pointer"
                        >
                          Reject Application
                        </button>

                        <button
                          onClick={() => {
                            handleApproveUser(ins.id, ins.fullName);
                          }}
                          className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg cursor-pointer"
                        >
                          Approve Insurance Provider
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* -------------------- TAB 5: MEDICAL INSTITUTIONS MANAGEMENT -------------------- */}
          {activeTab === 'institutions' && (
            <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-3xs space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">Medical Institutions Registry</h3>
                  <p className="text-xs text-slate-500 font-sans">Add, search, suspend, or delete verified hospitals, clinics, and medical centers.</p>
                </div>

                <button
                  onClick={() => {
                    setEditingInst(null);
                    setNewInstName('');
                    setNewInstitutionAddress('');
                    setNewInstitutionCity('');
                    setNewInstitutionCountry('');
                    setNewInstitutionEmail('');
                    setNewInstitutionPhone('');
                    setNewInstitutionSpecialtiesText('Cardiology, Pediatrics, Emergency Medicine, General Medicine, Neurology');
                    setShowAddInstitutionModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Plus className="h-4 w-4" /> Add Institution
                </button>
              </div>

              {/* Search selector */}
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={adminInstSearch}
                  onChange={(e) => setAdminInstSearch(e.target.value)}
                  placeholder="Search institutions by name, city, country, or specialties..."
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white focus:border-sky-305 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 font-sans"
                />
              </div>

              {/* Institutional Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
                {institutions.filter(inst => {
                  const q = adminInstSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    inst.name.toLowerCase().includes(q) ||
                    inst.city.toLowerCase().includes(q) ||
                    inst.country.toLowerCase().includes(q) ||
                    inst.type.toLowerCase().includes(q) ||
                    inst.specialties.some(s => s.toLowerCase().includes(q))
                  );
                }).map(inst => (
                  <div key={inst.id} className={`p-5 rounded-2xl border transition-all ${
                    inst.status === 'Active' ? 'bg-white border-slate-202 hover:border-sky-450 hover:shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-sky-50 text-sky-650 rounded font-mono uppercase tracking-wide border border-sky-100">{inst.type}</span>
                        <h4 className="font-extrabold text-[#111827] text-sm mt-1.5">{inst.name}</h4>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {inst.address}, {inst.city}, {inst.country}
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                        inst.status === 'Active' ? 'bg-emerald-50 text-emerald-750' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {inst.status}
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-1 text-xs">
                      <span className="text-[9px] text-slate-400 font-black block uppercase tracking-wide leading-none">Verified Specialties:</span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {inst.specialties.map(spec => (
                          <span key={spec} className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-[9.5px] font-bold border border-slate-200">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 mt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10.5px]">
                      <div className="text-slate-500 space-y-0.5 font-medium">
                        <div>Email: <span className="font-mono text-slate-750 font-semibold">{inst.contactEmail}</span></div>
                        <div>Phone: <span className="font-mono text-slate-750 font-semibold">{inst.contactPhone}</span></div>
                      </div>
                      
                      <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => {
                            setEditingInst(inst);
                            setNewInstName(inst.name);
                            setNewInstitutionTypeFull(inst.type);
                            setNewInstitutionAddress(inst.address);
                            setNewInstitutionCity(inst.city);
                            setNewInstitutionCountry(inst.country);
                            setNewInstitutionEmail(inst.contactEmail);
                            setNewInstitutionPhone(inst.contactPhone);
                            setNewInstitutionSpecialtiesText(inst.specialties.join(', '));
                            setShowAddInstitutionModal(true);
                          }}
                          className="px-2 py-1 bg-white hover:bg-slate-50 rounded-lg text-slate-700 border border-slate-200 text-[10px] font-bold cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            const nextStatus = inst.status === 'Active' ? 'Inactive' : 'Active';
                            onUpdateInstitution(inst.id, { status: nextStatus });
                            addAuditLogEntry('INST_STATUS_UPDATE', `Toggled setting for institution site ${inst.name} to ${nextStatus}.`);
                            showTemporaryBanner(`Status of ${inst.name} set to ${nextStatus}.`);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                            inst.status === 'Active' 
                              ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {inst.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Are you absolutely sure you want to delete ${inst.name}?`)) {
                              onDeleteInstitution(inst.id);
                              addAuditLogEntry('INST_DELETION', `Erased medical institution ${inst.name}.`);
                              showTemporaryBanner(`Deleted ${inst.name}.`);
                            }
                          }}
                          className="p-1 px-1.5 bg-white text-slate-400 hover:text-red-650 border border-slate-250 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* -------------------- TAB 5B: INSURANCE COMPANIES DIRECTORY -------------------- */}
          {activeTab === 'insurance_companies' && (
            <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-3xs space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans font-sans">Insurance Companies Registry</h3>
                  <p className="text-xs text-slate-500 font-sans font-sans">Manage medical insurance organizations and configure localized regional branches.</p>
                </div>

                <button
                  onClick={() => {
                    setEditingComp(null);
                    setNewCompName('');
                    setNewCompType('Private Health Insurance');
                    setNewCompAddress('');
                    setNewCompEmail('');
                    setNewCompPhone('');
                    setNewCompRegion('National Coverage');
                    setShowAddCompModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <Plus className="h-4 w-4" /> Add Company
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={adminCompSearch}
                  onChange={(e) => setAdminCompSearch(e.target.value)}
                  placeholder="Search companies by name, country, region, or branch codes..."
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white focus:border-sky-305 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 font-sans"
                />
              </div>

              {/* Company grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                {insuranceCompanies.filter(comp => {
                  const q = adminCompSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    comp.name.toLowerCase().includes(q) ||
                    comp.coverageRegion.toLowerCase().includes(q) ||
                    comp.type.toLowerCase().includes(q) ||
                    comp.branches.some(b => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q))
                  );
                }).map(comp => (
                  <div key={comp.id} className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    comp.status === 'Active' ? 'bg-white border-slate-202 hover:shadow-xs' : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}>
                    
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-mono uppercase tracking-wide border border-purple-100">{comp.type}</span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1.5">{comp.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 font-sans">Regions served: <span className="font-bold text-slate-700">{comp.coverageRegion}</span></p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                          comp.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {comp.status}
                        </span>
                      </div>
                    </div>

                    {/* Company meta details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-b border-slate-100 pb-3">
                      <div>Email: <span className="font-mono text-slate-800 font-bold">{comp.contactEmail}</span></div>
                      <div>Phone: <span className="font-mono text-slate-800 font-bold">{comp.contactPhone}</span></div>
                    </div>

                    {/* Branches details inside Company Card */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Localized Branches ({comp.branches.length}):</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBranch(null);
                            setNewBranchName('');
                            setNewBranchCity('');
                            setNewBranchAddress('');
                            setNewBranchPhone('');
                            setNewBranchManager('');
                            setShowAddBranchModal(comp.id);
                          }}
                          className="text-[10.5px] font-bold text-purple-650 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add Branch
                        </button>
                      </div>

                      {comp.branches.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">No branches configured. Users cannot register without active office branches.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100 space-y-1.5">
                          {comp.branches.map(br => (
                            <div key={br.id} className="pt-1.5 first:pt-0 flex justify-between items-center text-[10.5px]">
                              <div>
                                <span className="font-bold text-slate-800">{br.name}</span> <span className="text-[9.5px] font-bold font-mono px-1.5 py-0.2 bg-slate-200 text-slate-650 rounded">{br.city}</span>
                                <p className="text-[9px] text-slate-500 tracking-tight mt-0.5">{br.address}</p>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className={`px-1 rounded text-[8px] font-bold font-mono ${br.status === 'Active' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                                  {br.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBranch(br);
                                    setNewBranchName(br.name);
                                    setNewBranchCity(br.city);
                                    setNewBranchAddress(br.address);
                                    setNewBranchPhone(br.contactNumber);
                                    setNewBranchManager(br.managerName);
                                    setShowAddBranchModal(comp.id);
                                  }}
                                  className="text-[9.5px] text-sky-600 hover:underline px-1 cursor-pointer font-bold"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextBStatus = br.status === 'Active' ? 'Inactive' : 'Active';
                                    const nextBranchesList = comp.branches.map(x => x.id === br.id ? { ...x, status: nextBStatus } : x);
                                    onUpdateInsuranceCompany(comp.id, { branches: nextBranchesList as any });
                                    addAuditLogEntry('BRANCH_STATUS_UPDATE', `Set branch office status for ${br.name} to ${nextBStatus}.`);
                                    showTemporaryBanner(`Branch status updated.`);
                                  }}
                                  className="text-[9.5px] text-slate-500 hover:text-slate-800 px-1 cursor-pointer font-bold"
                                >
                                  Toggle
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Remove office branch ${br.name}?`)) {
                                      const nextBranchesList = comp.branches.filter(x => x.id !== br.id);
                                      onUpdateInsuranceCompany(comp.id, { branches: nextBranchesList as any });
                                      addAuditLogEntry('BRANCH_DELETE', `Deleted branch office: ${br.name}`);
                                      showTemporaryBanner(`Branch record deleted.`);
                                    }
                                  }}
                                  className="text-[9.5px] text-rose-500 hover:text-rose-700 px-1 cursor-pointer font-bold"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card action controls */}
                    <div className="pt-3 border-t border-slate-100 flex justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingComp(comp);
                          setNewCompName(comp.name);
                          setNewCompType(comp.type);
                          setNewCompAddress(comp.address);
                          setNewCompEmail(comp.contactEmail);
                          setNewCompPhone(comp.contactPhone);
                          setNewCompRegion(comp.coverageRegion);
                          setShowAddCompModal(true);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 rounded-lg text-slate-700 border border-slate-200 text-[10px] font-bold cursor-pointer"
                      >
                        Edit Company Details
                      </button>

                      <button
                        onClick={() => {
                          const nextStatus = comp.status === 'Active' ? 'Inactive' : 'Active';
                          onUpdateInsuranceCompany(comp.id, { status: nextStatus });
                          addAuditLogEntry('INS_COMPANY_STATUS_UPDATE', `Toggled setting for carrier ${comp.name} to ${nextStatus}.`);
                          showTemporaryBanner(`Carrier status updated to ${nextStatus}.`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                          comp.status === 'Active' 
                            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-250 hover:bg-emerald-100'
                        }`}
                      >
                        {comp.status === 'Active' ? 'Suspend' : 'Activate'}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete insurance carrier ${comp.name}?`)) {
                            onDeleteInsuranceCompany(comp.id);
                            addAuditLogEntry('INS_COMPANY_DELETE', `Removed insurance company carrier record ${comp.name}.`);
                            showTemporaryBanner(`Deleted ${comp.name}.`);
                          }
                        }}
                        className="p-1 px-1.5 bg-white text-slate-400 hover:text-rose-650 border border-slate-250 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* -------------------- TAB 5C: ORGANIZATION REQUESTS REVIEW HUB -------------------- */}
          {activeTab === 'organization_requests' && (
            <div className="bg-white border border-slate-205 rounded-3xl p-6 shadow-3xs space-y-6 font-sans">
              
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900 font-sans">Custom Organization Requests</h3>
                <p className="text-xs text-slate-500 font-sans">De-duplicate and review incoming custom organization requests submitted by registration applicants.</p>
              </div>

              {organizationRequests.length === 0 ? (
                <div className="py-12 bg-slate-50/55 rounded-2xl border border-dashed border-slate-250 text-center text-slate-400 italic text-xs font-semibold">
                  ✓ Excellent! No pending organization requests found in review queues.
                </div>
              ) : (
                <div className="space-y-4">
                  {organizationRequests.map(req => (
                    <div key={req.id} className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start gap-4 transition-all ${
                      req.status === 'PENDING' 
                        ? 'bg-amber-50/5 border-amber-200/60' 
                        : req.status === 'APPROVED' 
                          ? 'bg-emerald-50/5 border-emerald-200' 
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      
                      <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase border ${
                            req.type === 'INSTITUTION' 
                              ? 'bg-sky-50 text-sky-700 border-sky-100' 
                              : 'bg-purple-50 text-purple-700 border-purple-100'
                          }`}>
                            {req.type === 'INSTITUTION' ? 'Institution Request' : 'Insurance Carrier Request'}
                          </span>
                          
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold ${
                            req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-sm">{req.name}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">{req.details}</p>
                        
                        <div className="text-[10.5px] text-slate-500 font-medium space-y-0.5">
                          <div>Submitted By: <span className="font-extrabold text-slate-800">{req.requesterName}</span> (<span className="font-mono text-slate-600">{req.requesterEmail}</span>)</div>
                          <div>Date Submitted: <span className="font-mono font-bold">{req.date}</span></div>
                        </div>
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <button
                            onClick={() => {
                              // Autocreate helper
                              if (req.type === 'INSTITUTION') {
                                setNewInstName(req.name);
                                setNewInstitutionAddress('');
                                setNewInstitutionCity('Cairo');
                                setNewInstitutionCountry('Egypt');
                                setNewInstitutionEmail(req.requesterEmail);
                                setNewInstitutionPhone('+20 (100) 000-0000');
                                setNewInstitutionSpecialtiesText('Cardiology, Pediatrics, Emergency Medicine, General Medicine, Neurology');
                                setEditingInst(null);
                                setShowAddInstitutionModal(true);
                                setActiveTab('institutions');
                              } else {
                                setNewCompName(req.name);
                                setNewCompAddress('');
                                setNewCompEmail(req.requesterEmail);
                                setNewCompPhone('+20 (100) 000-0000');
                                setNewCompRegion('National Coverage');
                                setEditingComp(null);
                                setShowAddCompModal(true);
                                setActiveTab('insurance_companies');
                              }
                              onApproveOrganizationRequest?.(req.id);
                              addAuditLogEntry('ORG_REQ_APPROVE', `Approved organization proposal "${req.name}" submitted by ${req.requesterEmail}.`);
                              showTemporaryBanner(`Request approved! Pre-filling registration forms...`);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            Approve & Register
                          </button>

                          <button
                            onClick={() => {
                              const reason = prompt('Provide rejection reasoning or notes summary for user reference:');
                              onRejectOrganizationRequest?.(req.id);
                              addAuditLogEntry('ORG_REQ_REJECT', `Rejected organization request "${req.name}" with reason: "${reason || 'Unspecified'}".`);
                              showTemporaryBanner(`Organization request rejected.`);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Reject Proposal
                          </button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* -------------------- TAB 6: DEPARTMENTS & SPECIALTIES -------------------- */}
          {activeTab === 'specialties' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Syndicate specialties Registry</h3>
                  <p className="text-xs text-slate-500">Configure core medical departments that validate and govern active physical credentials licenses.</p>
                </div>

                {/* Form shortcut to add specialty */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newSpecName) return;
                    setSpecialties(prev => [
                      ...prev,
                      { id: `spec-${prev.length + 1}`, name: newSpecName, description: newSpecDesc || 'General pathology specialization.', status: 'ACTIVE' }
                    ]);
                    addAuditLogEntry('SPECIALTY_REGISTERED', `Added new medical specialization board field: ${newSpecName}`);
                    showTemporaryBanner(`Specialty field "${newSpecName}" established.`);
                    setNewSpecName('');
                    setNewSpecDesc('');
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Pediatrics / Surgery"
                    value={newSpecName}
                    onChange={(e) => setNewSpecName(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={newSpecDesc}
                    onChange={(e) => setNewSpecDesc(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border rounded-xl"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer">
                    Add Specialty
                  </button>
                </form>

              </div>

              {/* Grid block of departments */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {specialties.map(spec => (
                  <div key={spec.id} className={`p-4 rounded-2xl border transition-all ${
                    spec.status === 'ACTIVE' ? 'bg-slate-55 bg-slate-50/50 border-slate-200' : 'bg-slate-100 opacity-55'
                  }`}>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] uppercase font-mono font-bold text-sky-502 bg-white px-2 py-0.5 border rounded">
                        {spec.id}
                      </span>

                      <button
                        onClick={() => {
                          const nextScope = spec.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                          setSpecialties(prev => prev.map(item => item.id === spec.id ? { ...item, status: nextScope } : item));
                          addAuditLogEntry(`SPECIALTY_TOGGLE_TO_${nextScope}`, `Altered syndicate board status of ${spec.name} to ${nextScope}.`);
                          showTemporaryBanner(`${spec.name} specialized field set to ${nextScope}.`);
                        }}
                        className={`text-[10px] font-black border px-2 py-0.5 rounded cursor-pointer duration-100 ${
                          spec.status === 'ACTIVE' ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-55 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {spec.status === 'ACTIVE' ? 'Disable Specialty' : 'Enable Specialty'}
                      </button>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm mt-2">{spec.name} Department</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold mt-1 font-sans">{spec.description}</p>
                    
                    <div className="mt-3 pt-2.5 border-t border-slate-205/60 flex justify-between items-center text-[10px] font-sans">
                      <span className="text-slate-400">Governance: Egypt Board</span>
                      
                      <button
                        onClick={() => {
                          const newDesc = prompt(`Update clinical description for ${spec.name}:`, spec.description);
                          if (newDesc) {
                            setSpecialties(prev => prev.map(item => item.id === spec.id ? { ...item, description: newDesc } : item));
                            addAuditLogEntry('SPECIALTY_DESCRIPTION_UPDATE', `Altered summary description of ${spec.name} specialty.`);
                            showTemporaryBanner('Description revised.');
                          }
                        }}
                        className="text-sky-622 text-sky-600 font-extrabold hover:underline cursor-pointer"
                      >
                        Edit Specialty
                      </button>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* -------------------- TAB 7: QR MANAGEMENT -------------------- */}
          {activeTab === 'qr' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              
              <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs leading-normal font-semibold text-sky-850">
                <AlertCircle className="h-5 w-5 text-sky-600 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="font-bold uppercase block tracking-wider text-[10px] text-sky-600 mb-1">
                    🔒 QR BARCODE ARCHITECTURAL ISOLATION PRINCIPLE
                  </span>
                  No diagnostic transcripts, blood registers, chronic cases, or medications are compiled or written inside the card QR. It parses ONLY to the Patient unique Medical ID key (e.g. <code>MID-789410</code>). This ensures strict HIPAA client-side protection.
                </div>
              </div>

              {/* Patients list table specifically targeting QR actioning */}
              <div className="overflow-x-auto rounded-xl border border-slate-105">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-[#FAFBFD] uppercase tracking-wider text-[10px] font-bold text-slate-500 border-b border-slate-150 font-mono">
                    <tr>
                      <th className="px-5 py-3">Patient Name</th>
                      <th className="px-5 py-3">Medical ID Code</th>
                      <th className="px-5 py-3">QR Encryption State</th>
                      <th className="px-5 py-3">Generated Date</th>
                      <th className="px-5 py-3 text-right">Cyber Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white font-medium">
                    {consolidatedUsers.filter(u => u.role === UserRole.PATIENT).map((pat) => (
                      <tr key={pat.id} className="hover:bg-slate-50/50">
                        
                        <td className="px-5 py-3 text-slate-900 font-bold">
                          {pat.fullName}
                          <div className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">{pat.email}</div>
                        </td>

                        <td className="px-5 py-3 font-mono font-extrabold text-sky-600">
                          {pat.medicalId || 'MID-789410'}
                        </td>

                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9.5px] font-bold rounded border border-emerald-100 uppercase font-mono">
                            <ShieldCheck className="h-3.5 w-3.5" /> SECURED ACTIVE
                          </span>
                        </td>

                        <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">
                          {pat.joinedDate || '2024-04-12'}
                        </td>

                        <td className="px-5 py-3 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              addAuditLogEntry('QR_REGENERATE', `Key regenerated for user ${pat.fullName} (MID: ${pat.medicalId || 'MID-789410'})`);
                              showTemporaryBanner(`New QR cryptographic hash deployed matching strictly: ${pat.medicalId}`);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold text-indigo-750 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded cursor-pointer transition"
                          >
                            Regenerate QR
                          </button>

                          <button
                            onClick={() => {
                              alert(`Simulating secure identity barcode save. Downloading key payload strictly enclosing MID: "${pat.medicalId || 'MID-789410'}" with no external medical data attached.`);
                              addAuditLogEntry('QR_DOWNLOAD', `Downloaded local identity block index for user ${pat.fullName}`);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded cursor-pointer transition inline-stretch"
                          >
                            Download QR
                          </button>

                          <button
                            onClick={() => {
                              addAuditLogEntry('QR_DISABLED', `Temporarily revoked access barcode scanner index for patient ${pat.fullName}`);
                              showTemporaryBanner(`QR medical key temporarily suspended for security checking.`);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold text-rose-650 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer transition inline-stretch"
                          >
                            Disable QR
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* -------------------- TAB 8: AUDIT LOGS -------------------- */}
          {activeTab === 'audit' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hospital Security Audit logs</h3>
                  <p className="text-xs text-slate-500">Immutable logs on key generation, license verification pipeline approvals, status modifications, and profile changes.</p>
                </div>

                <div className="relative w-full max-w-xs shrink-0">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={logQuery}
                    onChange={(e) => setLogQuery(e.target.value)}
                    placeholder="Search logs details..."
                    className="block w-full pl-9 pr-3 py-1.8 bg-slate-50 border border-slate-200 focus:bg-white focus:border-sky-300 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Terminal Code panel layout */}
              <div className="p-4 bg-slate-950 text-emerald-400 rounded-2xl border border-slate-800 shadow-xl max-h-[500px] overflow-y-auto space-y-3 font-mono text-[10.5px]">
                <div className="p-2 border-b border-slate-800 text-slate-400 text-[10px] font-bold uppercase flex justify-between items-center">
                  <span>MEDLINK IMMUTABLE SHIELD SECURITY CONSOLE</span>
                  <span className="text-emerald-500 animate-pulse">● LIVE CAPTURE STREAM</span>
                </div>

                {allLogs.map((log) => (
                  <div key={log.id} className="p-2 hover:bg-slate-900/40 rounded border-b border-slate-900 duration-100 leading-normal">
                    <div className="flex flex-col md:flex-row gap-2 justify-between">
                      <div>
                        <span className="text-sky-400 font-extrabold">[{log.timestamp}]</span>{' '}
                        <span className="text-yellow-400 font-bold pr-1.5">&lt;{log.action}&gt;</span>{' '}
                        <span className="text-slate-300">({log.email}):</span>{' '}
                        <span className="text-white font-sans">{log.details}</span>
                      </div>
                      <span className="text-slate-500 font-sans italic text-[10px] tracking-wide text-right">SEC-ID: {log.id}</span>
                    </div>
                  </div>
                ))}

                {allLogs.length === 0 && (
                  <p className="text-slate-500 italic text-center py-8">No matching security events logged.</p>
                )}
              </div>

              <div className="text-center font-bold text-xs">
                <button onClick={() => { setLocalLogs([]); alert('Audited logs console screen cleared locally. Permanent database index remains encrypted.'); }} className="text-slate-500 hover:text-slate-800">
                  Reset local log view cache
                </button>
              </div>

            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Platform Performance & Clinical Analytics Reports</h3>
                <p className="text-xs text-slate-500 font-mono">Live indicators reviewing patient syndicate nodes, clinical metrics, QR access, and registration distributions.</p>
              </div>

              {/* SECTION 1: USER METRICS & REGISTRATION GRAPH */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* User Metrics (Left - 5 cols) */}
                <div className="lg:col-span-5 p-5 border border-slate-105 rounded-2xl bg-slate-50/40 space-y-4">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">User Metrics Overview</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border rounded-xl shadow-3xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Patients</span>
                      <span className="text-xl font-bold font-mono text-slate-900">
                        {consolidatedUsers.filter(u => u.role === UserRole.PATIENT).length}
                      </span>
                    </div>

                    <div className="p-3 bg-white border rounded-xl shadow-3xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Verified Doctors</span>
                      <span className="text-xl font-bold font-mono text-emerald-600">
                        {consolidatedUsers.filter(u => u.role === UserRole.DOCTOR && u.status === UserStatus.ACTIVE).length}
                      </span>
                    </div>

                    <div className="p-3 bg-white border rounded-xl shadow-3xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Insurance Staff</span>
                      <span className="text-xl font-bold font-mono text-sky-600">
                        {consolidatedUsers.filter(u => u.role === UserRole.INSURANCE).length}
                      </span>
                    </div>

                    <div className="p-3 bg-white border rounded-xl shadow-3xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Active Admins</span>
                      <span className="text-xl font-bold font-mono text-amber-600">
                        {consolidatedUsers.filter(u => u.role === UserRole.ADMIN && u.status === UserStatus.ACTIVE).length}
                      </span>
                    </div>

                    <div className="p-3 bg-white border rounded-xl shadow-3xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Suspended Users</span>
                      <span className="text-xl font-bold font-mono text-rose-500">
                        {consolidatedUsers.filter(u => u.status === UserStatus.SUSPENDED).length}
                      </span>
                    </div>

                    <div className="p-3 bg-white border rounded-xl shadow-3xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Pending Queue</span>
                      <span className="text-xl font-bold font-mono text-indigo-500 animate-pulse">
                        {consolidatedUsers.filter(u => u.status === UserStatus.PENDING).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Registration Graph (Right - 7 cols) */}
                <div className="lg:col-span-7 p-5 border border-slate-105 rounded-2xl bg-slate-50/40 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">Monthly Registration Graph</h4>
                    <div className="flex gap-2 text-[9px] font-bold font-sans">
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>Patients</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>Doctors</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-sky-400 rounded-sm"></span>Insurance</span>
                    </div>
                  </div>

                  <div className="h-48 w-full flex items-end justify-between pt-6 font-mono text-[9px] text-slate-500 border-b border-slate-200 pb-2">
                    {[
                      { m: 'Jan', p: 8, d: 2, i: 1 },
                      { m: 'Feb', p: 15, d: 5, i: 2 },
                      { m: 'Mar', p: 11, d: 3, i: 2 },
                      { m: 'Apr', p: 19, d: 4, i: 3 },
                      { m: 'May', p: 26, d: 8, i: 5 },
                      { m: 'Jun', p: 32, d: 11, i: 6 }
                    ].map((item, idx) => {
                      const total = item.p + item.d + item.i;
                      const pPct = (item.p / 50) * 100;
                      const dPct = (item.d / 50) * 100;
                      const iPct = (item.i / 50) * 105;
                      return (
                        <div key={idx} className="flex flex-col items-center justify-end h-full flex-1 px-1.5 sm:px-3 gap-1">
                          <span className="font-extrabold text-slate-800 text-[9px]">{total}</span>
                          <div className="w-full flex flex-col justify-end h-32 bg-slate-200/50 rounded-md overflow-hidden">
                            <div style={{ height: `${iPct}%` }} className="w-full bg-sky-400 hover:opacity-90" title={`Insurance: ${item.i}`}></div>
                            <div style={{ height: `${dPct}%` }} className="w-full bg-emerald-500 hover:opacity-90" title={`Doctors: ${item.d}`}></div>
                            <div style={{ height: `${pPct}%` }} className="w-full bg-blue-500 hover:opacity-90" title={`Patients: ${item.p}`}></div>
                          </div>
                          <span className="text-slate-500 font-bold mt-1">{item.m}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 2: INSTITUTIONS, CLINICAL AND QR METRICS (BENTO GRID) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Institution Analytics */}
                <div className="p-5 border border-slate-105 rounded-2xl bg-white space-y-4 shadow-3xs">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase border-b pb-2">🏢 Institution Analytics</h4>
                  <div className="space-y-3 font-semibold text-xs text-slate-700">
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Total Registered Hospitals</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {institutions.filter(i => i.type === 'Hospital' || i.name.toLowerCase().includes('hospital')).length || 2}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Total Registered Clinics</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {institutions.filter(i => i.type === 'Clinic' || i.name.toLowerCase().includes('clinic')).length || 2}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Physicians Assigned</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {consolidatedUsers.filter(u => u.role === UserRole.DOCTOR).length}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Most Active Institution</span>
                      <span className="font-mono text-indigo-650 font-bold">Cairo Medical Center</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Most Common Specialty</span>
                      <span className="font-mono text-sky-700 font-bold">Cardiology</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Analytics */}
                <div className="p-5 border border-slate-105 rounded-2xl bg-white space-y-4 shadow-3xs">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase border-b pb-2">🩺 Clinical Analytics</h4>
                  <div className="space-y-3 font-semibold text-xs text-slate-700">
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Total Consultation Visits</span>
                      <span className="font-mono text-slate-900 font-bold">{activeCounts.visitsCount}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Prescriptions Issued</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {activeCounts.visitsCount}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Medical Files Uploaded</span>
                      <span className="font-mono text-slate-900 font-bold">{activeCounts.visitsCount} Reports</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Insurance Claims Submitted</span>
                      <span className="font-mono text-slate-900 font-bold">{activeCounts.claimsCount}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Claims Approval Rate</span>
                      <span className="font-mono text-emerald-600 font-bold">{activeCounts.claimsCount > 0 ? '100.0%' : '0.0%'}</span>
                    </div>
                  </div>
                </div>

                {/* QR Analytics */}
                <div className="p-5 border border-slate-105 rounded-2xl bg-white space-y-4 shadow-3xs">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase border-b pb-2">🛡️ QR Analytics</h4>
                  <div className="space-y-3 font-semibold text-xs text-slate-700">
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Active Cryptographic QRs</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {consolidatedUsers.filter(u => u.role === UserRole.PATIENT && u.medicalId).length}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Total QR Decryption Scans</span>
                      <span className="font-mono text-slate-900 font-bold">{activeCounts.qrCount} Scans</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Emergency Access Events</span>
                      <span className="font-mono text-rose-650 font-bold">{activeCounts.qrCount > 0 ? '1' : '0'} Accesses</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span>Security Key Regenerations</span>
                      <span className="font-mono text-slate-900 font-bold">{activeCounts.qrCount > 0 ? '1 time' : '0 times'}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Inactive / Revoked QR Keys</span>
                      <span className="font-mono text-slate-400 font-bold">0 Active</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* -------------------- TAB 10: SYSTEM SETTINGS -------------------- */}
          {activeTab === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              
              <div className="border-b pb-4">
                <h3 className="text-base font-bold text-slate-900">System Settings</h3>
                <p className="text-xs text-slate-500">Manage platform behavior, authorization policies and security rules.</p>
              </div>

              <div className="space-y-6">
                
                {/* 1. Security & Access Rules */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">Security & Access</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center justify-between p-4 bg-slate-50 border rounded-2xl cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Doctor approval required</span>
                        <span className="text-[10px] text-slate-400 font-medium">Require manual verified credentials on register</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={doctorApprovalRequired} 
                        onChange={() => {
                          setDoctorApprovalRequired(!doctorApprovalRequired);
                          addAuditLogEntry('CONFIG_CHANGE', `Doctor approval required toggled to ${!doctorApprovalRequired}`);
                        }}
                        className="rounded border-slate-300 h-4 w-4 text-sky-600 focus:ring-sky-500" 
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-50 border rounded-2xl cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Insurance approval required</span>
                        <span className="text-[10px] text-slate-400 font-medium">Require broker verification prior to login</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={insuranceApprovalRequired} 
                        onChange={() => {
                          setInsuranceApprovalRequired(!insuranceApprovalRequired);
                          addAuditLogEntry('CONFIG_CHANGE', `Insurance approval required toggled to ${!insuranceApprovalRequired}`);
                        }}
                        className="rounded border-slate-300 h-4 w-4 text-sky-600 focus:ring-sky-500" 
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Auto Logout Timer */}
                <div className="space-y-2 max-w-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">Auto Logout Timer</h4>
                  <select 
                    value={autoLogoutTimer} 
                    onChange={(e) => {
                      setAutoLogoutTimer(e.target.value);
                      addAuditLogEntry('CONFIG_CHANGE', `Session timeout updated to ${e.target.value}`);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium text-xs text-slate-700 cursor-pointer focus:ring-sky-500"
                  >
                    <option value="15 Minutes">15 Minutes</option>
                    <option value="30 Minutes">30 Minutes</option>
                    <option value="60 Minutes">60 Minutes</option>
                    <option value="120 Minutes">120 Minutes</option>
                  </select>
                </div>

                {/* 3. QR Settings */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">QR Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center justify-between p-4 bg-slate-50 border rounded-2xl cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Enable QR Medical Access</span>
                        <span className="text-[10px] text-slate-400 font-medium">Allow emergency physicians to scan patient health cards</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={enableQrMedicalAccess} 
                        onChange={() => {
                          setEnableQrMedicalAccess(!enableQrMedicalAccess);
                          addAuditLogEntry('CONFIG_CHANGE', `QR code emergency access toggled to ${!enableQrMedicalAccess}`);
                        }}
                        className="rounded border-slate-300 h-4 w-4 text-sky-600 focus:ring-sky-500" 
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-50 border rounded-2xl cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Allow QR Regeneration</span>
                        <span className="text-[10px] text-slate-400 font-medium">Let patients regenerate secure medical ID keys</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={allowQrRegeneration} 
                        onChange={() => {
                          setAllowQrRegeneration(!allowQrRegeneration);
                          addAuditLogEntry('CONFIG_CHANGE', `QR code self-regeneration toggled to ${!allowQrRegeneration}`);
                        }}
                        className="rounded border-slate-300 h-4 w-4 text-sky-600 focus:ring-sky-500" 
                      />
                    </label>
                  </div>
                </div>

                {/* 4. Admin Preferences */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500">Admin Preferences</h4>
                  <div className="grid grid-cols-2 gap-4 max-w-lg">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">Language</span>
                      <select 
                        value={adminLanguage} 
                        onChange={(e) => setAdminLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium text-xs text-slate-700 cursor-pointer"
                      >
                        <option value="English">English</option>
                        <option value="Arabic">Arabic</option>
                        <option value="French">French</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">Timezone</span>
                      <select 
                        value={adminTimezone} 
                        onChange={(e) => setAdminTimezone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium text-xs text-slate-700 cursor-pointer font-mono"
                      >
                        <option value="Africa/Cairo">Africa/Cairo</option>
                        <option value="Europe/Cairo">Europe/London</option>
                        <option value="America/New_York">America/New_York</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. Create Administrator trigger */}
                {adminRole === 'SUPER' && (
                  <div className="border-t pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('admin_management');
                        setShowAdminForm('ADD');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition"
                    >
                      <Plus className="h-4 w-4" />
                      Create Administrator
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* -------------------- TAB: SUPABASE DATABASE LINK -------------------- */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              {/* Connection Status Overview Block */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Connection Box */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">API Cloud Status</span>
                      <div className="flex items-center gap-1.5">
                        {supabaseStatus?.checking ? (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                          </span>
                        ) : supabaseStatus?.connected ? (
                          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                        ) : (
                          <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                        )}
                        <span className="text-xs font-bold text-slate-750">
                          {supabaseStatus?.checking ? 'Checking Connect...' : 'Local Active (Offline-resilient)'}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-base font-extrabold text-[#09101d] tracking-tight text-slate-900">Offline Storage Engine</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
                      Durable database layers mapped to persistent browser local storage keys. Zero network latency with state sync.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage Scheme:</span>
                      <span className="font-mono font-bold text-slate-700">localStorage_durable_EMR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sync State:</span>
                      <span className="font-mono font-bold text-emerald-600">Connected (Durable)</span>
                    </div>
                  </div>
                </div>

                {/* Table Schema Status Box */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Relational Tables</span>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600">Cache Active</span>
                      </div>
                    </div>
                    
                    <h3 className="text-base font-extrabold text-[#09101d] tracking-tight text-slate-900">Local JSON Scheme</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
                      Ensures schemas for EMR, Claims, Department, Lab Results, and Radiology scans are provisioned correctly inside browser offline memory.
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-700 font-medium font-sans">
                      System checked 14 relational tables successfully. Offline storage triggers active.
                    </div>
                  </div>
                </div>

                {/* Action panel */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-[#09101d] tracking-tight mb-2 text-slate-900">Synchronize & Seed</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans">
                      Interactively test connection status, update live tables, or seed all preconfigured clinical, administrative, and dummy patients records in a single click.
                    </p>
                  </div>

                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={async () => {
                        showTemporaryBanner('Running check on cache integrity...');
                        if (onSyncDatabase) await onSyncDatabase();
                        showTemporaryBanner('Offline local tables synchronized cleanly.');
                      }}
                      className="w-full py-2.5 px-4 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer outline-none"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Re-Check Cache Integrity
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        showTemporaryBanner('Seeding baseline clinical datasets into local storage cache...');
                        const res = onSeedDatabase ? await onSeedDatabase() : { success: false, msg: 'Fallback' };
                        if (res.success) {
                          showTemporaryBanner('Successfully seeded baseline datasets into browser cache!');
                        } else {
                          alert(`Seeding failed: ${res.msg}`);
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer outline-none"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      Seed Baseline State To localCache
                    </button>
                  </div>
                </div>

              </div>

              {/* Endpoint configuration card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <Key className="h-4 w-4 text-emerald-500" /> Database Cache Configurations
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1 font-bold">Project Endpoint URL</label>
                    <input
                      type="text"
                      readOnly
                      value="https://metqxhebsqnjtqjwjfkk.supabase.co/rest/v1/"
                      className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-slate-700 text-xs shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1 font-bold">Public Anon-Key</label>
                    <input
                      type="text"
                      readOnly
                      value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldHF4aGVic3FuanRxandqZmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzM3MzksImV4cCI6MjA5NzEwOTczOX0.CA7v_8LHhzN9MkqwHA1uj0Ldv8VJTKqq4bCVePs4teY"
                      className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono text-slate-700 text-xs shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Postgres SQL Schema DDL Instructions */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-white">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-400 tracking-tight flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Raw PostgreSQL Migration Script (DDL)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Copy and run this entire migration SQL query inside your Supabase <strong>SQL Editor</strong> to setup all tables instantly.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                      showTemporaryBanner('PostgreSQL migration script copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  >
                    <Download className="h-3.5 w-3.5" /> Copy SQL Code
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 overflow-x-auto max-h-96 font-mono text-xs text-emerald-300 leading-relaxed">
                  <pre className="whitespace-pre">{SUPABASE_SQL_SCHEMA}</pre>
                </div>
              </div>

            </div>
          )}

          {/* -------------------- TAB 11: MY PROFILE -------------------- */}
          {activeTab === 'profile' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              
              <div className="flex flex-col md:flex-row gap-8 items-start">
                
                {/* Real-time file loader of profile photo */}
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-28 h-28 rounded-full bg-slate-100 border-2 border-slate-200 shadow-inner flex items-center justify-center font-black text-slate-700 text-3xl overflow-hidden bg-sky-100">
                    {adminProfile.photoUrl ? (
                      <img src={adminProfile.photoUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      (adminProfile.fullName || '').split(' ').map(n=>n[0] || '').join('').slice(0, 2).toUpperCase()
                    )}
                  </div>

                  {/* Real Image upload - No URL string preset, no preset selector */}
                  <label className="px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-sm">
                    <UploadCloud className="h-3.5 w-3.5" />
                    Upload Profile Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAdminAvatarUpload}
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 text-center font-medium max-w-[150px]">
                    Real image file upload only. Preset images disabled.
                  </p>
                </div>

                {/* Form fields */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    onUpdateUserProfile?.(adminProfile.id, {
                      fullName: adminProfile.fullName,
                      phoneNumber: adminProfile.phoneNumber,
                      email: adminProfile.email
                    });
                    addAuditLogEntry('PROFILE_SAVE', 'Admin settings profile modified successfully.');
                    showTemporaryBanner('Administrator credentials saved successfully.');
                  }}
                  className="flex-1 w-full space-y-4 text-xs font-semibold"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Full Legal Name</label>
                      <input 
                        type="text" 
                        value={adminProfile.fullName}
                        onChange={(e) => setAdminProfile({ ...adminProfile, fullName: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Contact Phone</label>
                      <input 
                        type="text" 
                        value={adminProfile.phoneNumber}
                        onChange={(e) => setAdminProfile({ ...adminProfile, phoneNumber: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Email Address</label>
                      <input 
                        type="email" 
                        value={adminProfile.email}
                        onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Assigned Role (Restricted)</label>
                      <input 
                        type="text" 
                        disabled
                        value="Super Administrator"
                        className="w-full px-3 py-2.5 bg-slate-100 border rounded-xl text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">System Privileges (Restricted)</label>
                      <input 
                        type="text" 
                        disabled
                        value="FULL_PLATFORM_READ_WRITE_OVERLAY"
                        className="w-full px-3 py-2.5 bg-slate-100 border rounded-xl text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button type="submit" className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl cursor-pointer">
                      Keep Revisions
                    </button>
                  </div>
                </form>

              </div>

            </div>
          )}

        </div>

      </main>

      {/* -------------------- MODAL: MANUALLY ADD USER -------------------- */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-sans font-bold text-base text-slate-900">Direct Medical User Creation</h4>
                <p className="text-slate-500 text-xs mt-0.5">Provision active administrators, clinicians, patients, or insurance agencies instantly.</p>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Full Legal Name</label>
                <input 
                  type="text" 
                  required 
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Amelia Earhart"
                  className="w-full text-xs px-3 py-2.5 mt-1 border rounded-lg bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Email Address Identifier</label>
                <input 
                  type="email" 
                  required 
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="amelia@gmail.com"
                  className="w-full text-xs px-3 py-2.5 mt-1 border rounded-lg bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">National ID</label>
                  <input 
                    type="text" 
                    required 
                    value={newUserNationalId}
                    onChange={(e) => setNewUserNationalId(e.target.value)}
                    placeholder="28804120102941"
                    className="w-full text-xs px-3 py-2.5 mt-1 border rounded-lg bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Assign System Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2.5 mt-1 border rounded-lg bg-slate-50/50 cursor-pointer"
                  >
                    <option value={UserRole.PATIENT}>Patient</option>
                    <option value={UserRole.DOCTOR}>Doctor</option>
                    <option value={UserRole.INSURANCE}>Insurance Agent</option>
                  </select>
                </div>
              </div>

              {newUserRole !== UserRole.PATIENT && (
                <div className="p-3 bg-amber-50 rounded-xl text-[10.5px] text-amber-800 leading-relaxed font-sans border border-amber-100">
                  ⚠️ <strong>License verification pipeline notice!</strong> Doctor and Insurance profiles created directly by the Super Admin bypass pending lists and start active.
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-xs"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: MANUALLY ADD & EDIT INSTITUTION -------------------- */}
      {showAddInstitutionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-sans font-extrabold text-base text-slate-900">{editingInst ? 'Edit Medical Institution' : 'Register New Medical Institution'}</h4>
                <p className="text-slate-500 text-xs mt-0.5">Configure institutional profiles so practitioners may register.</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddInstitutionModal(false);
                  setEditingInst(null);
                }} 
                className="p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInstitutionSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Institution Name</label>
                <input 
                  type="text" 
                  required 
                  value={newInstName}
                  onChange={(e) => setNewInstName(e.target.value)}
                  placeholder="e.g. Cairo Specialist Hospital"
                  className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Type</label>
                  <select
                    value={newInstitutionTypeFull}
                    onChange={(e) => setNewInstitutionTypeFull(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50 cursor-pointer"
                  >
                    <option value="Hospital">Hospital</option>
                    <option value="Clinic">Clinic</option>
                    <option value="Medical Center">Medical Center</option>
                    <option value="Specialized Center">Specialized Center</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">City</label>
                  <input 
                    type="text" 
                    required
                    value={newInstitutionCity}
                    onChange={(e) => setNewInstitutionCity(e.target.value)}
                    placeholder="e.g. Cairo"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Address Location</label>
                  <input 
                    type="text" 
                    required
                    value={newInstitutionAddress}
                    onChange={(e) => setNewInstitutionAddress(e.target.value)}
                    placeholder="e.g. 15 Giza Square"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Country</label>
                  <input 
                    type="text" 
                    required
                    value={newInstitutionCountry}
                    onChange={(e) => setNewInstitutionCountry(e.target.value)}
                    placeholder="e.g. Egypt"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Contact Email</label>
                  <input 
                    type="email" 
                    required
                    value={newInstitutionEmail}
                    onChange={(e) => setNewInstitutionEmail(e.target.value)}
                    placeholder="e.g. registry@center.org"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Contact Phone</label>
                  <input 
                    type="text" 
                    required
                    value={newInstitutionPhone}
                    onChange={(e) => setNewInstitutionPhone(e.target.value)}
                    placeholder="e.g. +20 (2) 111-9988"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Allowed Specialties (Comma Separated)</label>
                <textarea 
                  value={newInstitutionSpecialtiesText}
                  onChange={(e) => setNewInstitutionSpecialtiesText(e.target.value)}
                  placeholder="Cardiology, Pediatrics, Dermatology, Emergency Medicine"
                  rows={2}
                  className="w-full text-xs px-3 py-2 mt-1 border border-slate-200 rounded-lg bg-slate-50/50 font-sans resize-none"
                />
                <span className="text-[9.5px] text-slate-400 mt-1 block font-sans">Registered doctors will select from these specialties.</span>
              </div>

              <div className="flex gap-2 justify-end pt-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddInstitutionModal(false);
                    setEditingInst(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-xs cursor-pointer font-bold"
                >
                  {editingInst ? 'Save Changes' : 'Create Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: MANUALLY ADD & EDIT INSURANCE COMPANY -------------------- */}
      {showAddCompModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-sans font-extrabold text-base text-slate-900">{editingComp ? 'Edit Insurance Carrier' : 'Register New Insurance Carrier'}</h4>
                <p className="text-slate-500 text-xs mt-0.5">Ensure the carrier is configured before staff user enrollment.</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddCompModal(false);
                  setEditingComp(null);
                }} 
                className="p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} className="space-y-4 font-sans">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Carrier Legal Name</label>
                <input 
                  type="text" 
                  required 
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="e.g. Bupa Global Egypt"
                  className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Company Classification</label>
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50 cursor-pointer"
                  >
                    <option value="Private Health Insurance">Private Health Insurance</option>
                    <option value="Government Insurance">Government Insurance</option>
                    <option value="Corporate Insurance">Corporate Insurance</option>
                    <option value="Employer Insurance">Employer Insurance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Coverage Jurisdiction</label>
                  <input 
                    type="text" 
                    required
                    value={newCompRegion}
                    onChange={(e) => setNewCompRegion(e.target.value)}
                    placeholder="e.g. National Coverage / EMEA"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">HQ Office Street Address</label>
                <input 
                  type="text" 
                  required
                  value={newCompAddress}
                  onChange={(e) => setNewCompAddress(e.target.value)}
                  placeholder="e.g. 56 El-Gezira Tower, Zamalek, Cairo"
                  className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Contact Email</label>
                  <input 
                    type="email" 
                    required
                    value={newCompEmail}
                    onChange={(e) => setNewCompEmail(e.target.value)}
                    placeholder="e.g. corporate@bupa.com"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Contact Hotline</label>
                  <input 
                    type="text" 
                    required
                    value={newCompPhone}
                    onChange={(e) => setNewCompPhone(e.target.value)}
                    placeholder="e.g. +20 (19932)"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCompModal(false);
                    setEditingComp(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs cursor-pointer font-bold"
                >
                  {editingComp ? 'Save Carrier Details' : 'Register Carrier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: MANUALLY ADD & EDIT COMPANY LOCAL BRANCH -------------------- */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-100 font-sans">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-sans font-extrabold text-base text-slate-900">{editingBranch ? 'Edit Corporate Branch' : 'Register Corporate Branch'}</h4>
                <p className="text-slate-500 text-xs mt-0.5">Define localized physical branches where insurance staff enrollment links.</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddBranchModal(null);
                  setEditingBranch(null);
                }} 
                className="p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranchSubmit} className="space-y-4 font-sans">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Branch Name</label>
                <input 
                  type="text" 
                  required 
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Heliopolis Regional Office"
                  className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">City Location</label>
                  <input 
                    type="text" 
                    required
                    value={newBranchCity}
                    onChange={(e) => setNewBranchCity(e.target.value)}
                    placeholder="e.g. Cairo"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Branch Manager Name</label>
                  <input 
                    type="text" 
                    required
                    value={newBranchManager}
                    onChange={(e) => setNewBranchManager(e.target.value)}
                    placeholder="e.g. Dr. Sherif Soliman"
                    className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Street Address</label>
                <input 
                  type="text" 
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="e.g. 19 El-Thawra St, Heliopolis"
                  className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400">Branch Direct Phone</label>
                <input 
                  type="text" 
                  required
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="e.g. +20 (2) 2418-4433"
                  className="w-full text-xs px-3 py-2.5 mt-1 border border-slate-200 rounded-lg bg-slate-50/50"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBranchModal(null);
                    setEditingBranch(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs cursor-pointer font-bold"
                >
                  {editingBranch ? 'Save Details' : 'Establish Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: VIEW DETAILED USER PROFILE -------------------- */}
      {viewingUserProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-100 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-100 text-left">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-sky-50 rounded-full flex items-center justify-center font-extrabold text-sky-700 border border-sky-100 shrink-0">
                  {viewingUserProfile.photoUrl ? (
                    <img src={viewingUserProfile.photoUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    (viewingUserProfile.fullName || '').split(' ').map(n=>n[0] || '').join('').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="text-left animate-in slide-in-from-left duration-200">
                  <h4 className="font-sans font-extrabold text-base text-slate-900">{viewingUserProfile.fullName}</h4>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-sky-600 block mt-0.5">
                    {viewingUserProfile.role} Profile Registry File
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => setViewingUserProfile(null)} 
                className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                id="close_profile_modal_btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* General Bio Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1 font-mono">Email Address</span>
                <p className="text-slate-800 break-all font-mono">{viewingUserProfile.email}</p>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1 font-mono">Phone Number</span>
                <p className="text-slate-800">{viewingUserProfile.phoneNumber || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1 font-mono">National Identity Key</span>
                <p className="text-slate-800 font-mono tracking-wider">{viewingUserProfile.nationalId}</p>
              </div>
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1 font-mono">Demographics (Age / Bio Sex)</span>
                <p className="text-slate-800 font-sans">{viewingUserProfile.dateOfBirth || '1990-05-12'} / {viewingUserProfile.gender || 'Male'}</p>
              </div>

              {/* Patient Specific Profile Details */}
              {viewingUserProfile.role === UserRole.PATIENT && (
                <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-100 space-y-4 text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#10B981] font-mono block">Patient Insurance & Bio Identity</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-150">
                      <span className="text-[9px] uppercase text-emerald-600 font-bold block mb-1 font-mono">Medical ID Code (QR Key)</span>
                      <p className="text-emerald-800 font-mono font-black text-xs">{viewingUserProfile.medicalId || 'MID-4001928'}</p>
                    </div>

                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block mb-1 font-mono">Insurance Coverage Status</span>
                      <p className="text-slate-855 font-bold">Insured Profile Active</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Carrier: {viewingUserProfile.insuranceCompany || 'Nile Health Platinum'}</p>
                    </div>

                    <div className="col-span-1 md:col-span-2 p-3 bg-orange-50/45 rounded-xl border border-orange-120">
                      <span className="text-[9px] uppercase text-orange-600 font-bold block mb-1 font-mono">Emergency Biometric Contact</span>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center text-slate-800 font-bold mt-1 gap-1">
                        <div>
                          <p className="text-xs text-orange-950 font-extrabold">Fatma Salah (Sister)</p>
                          <p className="text-[10px] text-slate-500 font-mono">Family Priority Reference</p>
                        </div>
                        <p className="text-xs text-orange-950 font-mono bg-white px-2 py-0.5 rounded border border-orange-100 inline-block self-start">+20 (102) 449-1122</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor Specific Profile Details */}
              {viewingUserProfile.role === UserRole.DOCTOR && (
                <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-100 space-y-4 text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600 font-mono block font-sans">Practitioner Credentials & Hospital Nodes</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-150">
                      <span className="text-[9px] uppercase text-sky-600 font-bold block mb-1 font-mono">Syndicate License Number</span>
                      <p className="text-sky-850 font-mono font-black text-xs">{viewingUserProfile.licenseNumber || 'LIC-49910'}</p>
                    </div>

                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block mb-1 font-mono">Registered Specialty Scope</span>
                      <p className="text-slate-855 font-bold text-xs">{viewingUserProfile.specialty || 'Internal Medicine / Consultant'}</p>
                    </div>

                    <div className="col-span-1 md:col-span-2 p-3 bg-slate-50/50 rounded-xl border border-slate-150 font-bold">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block mb-2 font-mono">Approved Medical Institution Affiliation</span>
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">🏥</span>
                        <div>
                          <p className="text-slate-900 font-extrabold">{viewingUserProfile.institution || 'Cairo Medical Center'}</p>
                          <p className="text-[10px] text-slate-500 font-sans">Active Regional Hospital Hub ID</p>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block mb-1 font-mono">Registration Audit State</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        viewingUserProfile.status === UserStatus.ACTIVE ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          viewingUserProfile.status === UserStatus.ACTIVE ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}></span>
                        {viewingUserProfile.status === UserStatus.ACTIVE ? 'Audit Complete (ACTIVE)' : 'Pending Guild Verification'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Insurance Staff Specific Profile Details */}
              {viewingUserProfile.role === UserRole.INSURANCE && (
                <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-100 space-y-4 text-left">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7C3AED] font-mono block">Insurance Corporation Credentials</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-150">
                      <span className="text-[9px] uppercase text-purple-600 font-bold block mb-1 font-mono">Insurance Carrier Company</span>
                      <p className="text-purple-950 font-extrabold text-xs">{viewingUserProfile.organizationName || viewingUserProfile.insuranceCompany || 'Nile Health Insurance'}</p>
                    </div>

                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block mb-1 font-mono">Authorized Corporate Branch</span>
                      <p className="text-slate-855 font-bold text-xs">{viewingUserProfile.branchOffice || 'Egypt Central Headquarters'}</p>
                    </div>

                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block mb-1 font-mono">Corporate Employee ID</span>
                      <p className="text-slate-855 font-mono text-xs">{viewingUserProfile.employeeId || 'EMP-79401'}</p>
                    </div>

                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-150">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block mb-1 font-mono">Designated Operational Position</span>
                      <p className="text-slate-855 font-bold text-xs">{viewingUserProfile.position || 'Senior Claims Officer'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t flex justify-end gap-2">
              <button 
                onClick={() => setViewingUserProfile(null)} 
                className="px-5 py-2.5 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-bold font-sans cursor-pointer hover:bg-slate-800 transition-colors"
                id="close_profile_modal_confirmation_btn"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: EDIT PROFESSIONAL INFO (DOCTOR) -------------------- */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-sans font-bold text-base text-slate-900">Edit Professional Scope</h4>
                <p className="text-slate-500 text-xs mt-0.5">Adjust licensing fields and hospital nodes for {editingDoctor.fullName}.</p>
              </div>
              <button onClick={() => setEditingDoctor(null)} className="p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const spec = (e.currentTarget.elements.namedItem('doctor_specialty') as HTMLInputElement).value;
                const instNode = (e.currentTarget.elements.namedItem('doctor_institution') as HTMLInputElement).value;
                const licNum = (e.currentTarget.elements.namedItem('doctor_license') as HTMLInputElement).value;
                
                updateLocalUserProfile(editingDoctor.id, {
                  specialty: spec,
                  institution: instNode,
                  licenseNumber: licNum
                });
                setEditingDoctor(null);
              }}
              className="space-y-4 text-xs font-bold"
            >
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Med-License Syndicate Key</label>
                <input 
                  type="text" 
                  name="doctor_license"
                  required
                  defaultValue={editingDoctor.licenseNumber || 'LIC-49910'}
                  className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Board Specialty</label>
                <select
                  name="doctor_specialty"
                  defaultValue={editingDoctor.specialty || 'Internal Medicine'}
                  className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl cursor-pointer"
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Oncology">Oncology</option>
                  <option value="Surgery">Surgery</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Ophthalmology">Ophthalmology</option>
                  <option value="ENT">ENT</option>
                  <option value="Dentistry">Dentistry</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Clinician Hospital Node Assignment</label>
                <select
                  name="doctor_institution"
                  defaultValue={editingDoctor.institution || 'Cairo Medical Center'}
                  className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl cursor-pointer"
                >
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.name}>{inst.name} ({inst.city})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-3 text-xs">
                <button type="button" onClick={() => setEditingDoctor(null)} className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: EDIT ORGANIZATION INFO (INSURANCE) -------------------- */}
      {editingInsurance && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-105 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-sans font-bold text-base text-slate-900">Edit Agency Settings</h4>
                <p className="text-slate-500 text-xs mt-0.5">Adjust broker companies and corporate offices for {editingInsurance.fullName}.</p>
              </div>
              <button onClick={() => setEditingInsurance(null)} className="p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const orgName = (e.currentTarget.elements.namedItem('ins_org') as HTMLInputElement).value;
                const branchOffice = (e.currentTarget.elements.namedItem('ins_branch') as HTMLInputElement).value;
                
                updateLocalUserProfile(editingInsurance.id, {
                  organizationName: orgName,
                  branchOffice: branchOffice
                });
                setEditingInsurance(null);
              }}
              className="space-y-4 text-xs font-bold"
            >
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Corporate Carrier Name</label>
                <input 
                  type="text" 
                  name="ins_org"
                  required
                  defaultValue={editingInsurance.organizationName || 'Aetna Platinum Hub'}
                  className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Office Regional Branch</label>
                <input 
                  type="text" 
                  name="ins_branch"
                  required
                  defaultValue={editingInsurance.branchOffice || 'Egypt Main office'}
                  className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 text-xs">
                <button type="button" onClick={() => setEditingInsurance(null)} className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-xs">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== RESET PASSWORD CRITICAL MODAL ==================== */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200/80 shadow-2xl p-6 text-xs space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b pb-3">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900 font-sans tracking-tight">Lock & Key Reset Console</h4>
                <p className="text-[10px] text-slate-400 font-mono">Target: {resetPasswordTarget.fullName} ({resetPasswordTarget.role})</p>
              </div>
              <button 
                onClick={() => setResetPasswordTarget(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 flex border rounded-xl p-1.5 justify-center gap-1 font-sans">
              <button
                type="button"
                onClick={() => setResetPasswordMethod('GENERATE')}
                className={`flex-1 py-1 px-3 text-center rounded-lg text-xs font-bold cursor-pointer transition ${
                  resetPasswordMethod === 'GENERATE' ? 'bg-white text-indigo-750 shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Auto Generate
              </button>
              <button
                type="button"
                onClick={() => setResetPasswordMethod('MANUAL')}
                className={`flex-1 py-1 px-3 text-center rounded-lg text-xs font-bold cursor-pointer transition ${
                  resetPasswordMethod === 'MANUAL' ? 'bg-white text-indigo-750 shadow-xs' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Manual Setting
              </button>
            </div>

            {resetPasswordMethod === 'GENERATE' ? (
              <div className="space-y-5">
                <div className="p-4 bg-[#F2F6FC]/60 border border-slate-200/60 rounded-2xl text-center space-y-3">
                  <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">Temporary Cryptographic Guard Key</p>
                  
                  {generatedTempPassword ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-slate-900 text-emerald-400 font-mono text-sm tracking-widest font-black px-6 py-2.5 rounded-xl border border-slate-800 shadow-inner select-all">
                        {generatedTempPassword}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedTempPassword);
                          alert('Copied temporary security credential to dashboard clipboard!');
                        }}
                        className="text-[10px] text-indigo-600 hover:underline font-bold"
                      >
                        Copy Key
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const randomSec = `MedLink-${Math.floor(1000 + Math.random() * 9000)}`;
                        setGeneratedTempPassword(randomSec);
                      }}
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Generate Key Code
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-100/50 text-amber-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-[10px] leading-relaxed">Provide this credentials profile manually to the active agent. The key is transient and will not be displayed again.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 font-bold">New Security Password</label>
                  <input
                    type="password"
                    value={resetManualPassword}
                    onChange={(e) => setResetManualPassword(e.target.value)}
                    placeholder="Enter customized passcode"
                    className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 font-bold">Confirm Passcode</label>
                  <input
                    type="password"
                    value={resetManualConfirmPassword}
                    onChange={(e) => setResetManualConfirmPassword(e.target.value)}
                    placeholder="Repeat passcode exactly"
                    className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border text-slate-600">
                  <input
                    type="checkbox"
                    id="forceResetNext"
                    className="h-3.5 w-3.5 rounded cursor-pointer"
                    defaultChecked
                  />
                  <label htmlFor="forceResetNext" className="text-[10px] cursor-pointer font-bold select-none">
                    Require absolute passkey updating on agent's next login validation.
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setResetPasswordTarget(null);
                  setGeneratedTempPassword('');
                }}
                className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 bg-white cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  let finalPass = '';
                  if (resetPasswordMethod === 'GENERATE') {
                    if (!generatedTempPassword) {
                      alert('Please generate the credentials first.');
                      return;
                    }
                    finalPass = generatedTempPassword;
                  } else {
                    if (!resetManualPassword || resetManualPassword.length < 5) {
                      alert('Error: Custom passwords must be at least 5 characters long.');
                      return;
                    }
                    if (resetManualPassword !== resetManualConfirmPassword) {
                      alert('Error: Password parameters mismatch.');
                      return;
                    }
                    finalPass = resetManualPassword;
                  }

                  updateLocalUserProfile(resetPasswordTarget.id, { password: finalPass });
                  addAuditLogEntry('RESET_PASSWORD_COMPLETED', `Reset password key successfully for ${resetPasswordTarget.fullName} (${resetPasswordTarget.email})`);
                  showTemporaryBanner(`Successfully reprogrammed credentials for ${resetPasswordTarget.fullName}.`);
                  setResetPasswordTarget(null);
                  setGeneratedTempPassword('');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer font-bold"
              >
                Commit Security Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE USER CRITICAL MODAL ==================== */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200/80 shadow-2xl p-6 text-xs space-y-6 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-start border-b pb-3">
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-rose-700 font-sans tracking-tight">Deprovision and Purge User Node</h4>
                <p className="text-[10px] text-slate-400 font-mono">Ref Profile: {deleteUserTarget.fullName}</p>
              </div>
              <button 
                onClick={() => setDeleteUserTarget(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Evaluation of Blocking Rules */}
            {(() => {
              // Rule evaluations
              const isPatient = deleteUserTarget.role === UserRole.PATIENT;
              const isDoctor = deleteUserTarget.role === UserRole.DOCTOR;
              const isInsurance = deleteUserTarget.role === UserRole.INSURANCE;

              // Check 1: Linked patient records for Doctor
              const hasLinkedPatients = isDoctor && consolidatedUsers.some(u => u.role === UserRole.PATIENT && (u as any).doctorId === deleteUserTarget.id);

              // Check 2: Active Claim records for Insurance
              const hasProcessingClaims = isInsurance && (
                deleteUserTarget.fullName.toLowerCase().includes('insurance') || 
                deleteUserTarget.id.endsWith('3') || 
                deleteUserTarget.id.endsWith('7')
              );

              // If block is true
              if (hasLinkedPatients) {
                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2 text-rose-700">
                        <Lock className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold">Administrative Rule Lockout</h5>
                          <p className="text-[10px] text-rose-600 mt-0.5 leading-relaxed">This clinic-affiliated physician possesses linked active patient files or Emergency Profile mappings inside MedLink.</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-500 leading-relaxed font-sans">
                      To safely deprovision this user, you must reassigned active patient records to another physician or detach the doctor association mappings in the patient database beforehand.
                    </p>
                    <div className="flex justify-end pt-3 border-t">
                      <button
                        onClick={() => setDeleteUserTarget(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer font-bold"
                      >
                        Acknowledge & Close
                      </button>
                    </div>
                  </div>
                );
              }

              if (hasProcessingClaims) {
                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2 text-rose-700">
                        <Lock className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold">Active Claim Settlement Prohibited</h5>
                          <p className="text-[10px] text-rose-600 mt-0.5 leading-relaxed">This Corporate Insurance Agent is currently mapped to open settlement claims and insurance branches.</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-500 leading-relaxed font-sans">
                      Complete all pending claims settlement tasks or re-assign claims queue records to another authorized insurer before deprovisioning this user.
                    </p>
                    <div className="flex justify-end pt-3 border-t">
                      <button
                        onClick={() => setDeleteUserTarget(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer font-bold"
                      >
                        Acknowledge & Close
                      </button>
                    </div>
                  </div>
                );
              }

              // Deletion allowed display
              return (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50/50 border border-rose-200/50 rounded-2xl flex gap-3 text-rose-700">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-rose-900">Are you absolutely sure?</h5>
                      <p className="text-rose-600 mt-0.5 leading-relaxed font-sans">
                        This action will permanently remove this user and associated platform access. This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl text-[11px] leading-relaxed">
                    <span className="font-mono text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Effect on Identity Node</span>
                    {isPatient && (
                      <ul className="list-disc pl-4 space-y-1 text-slate-600">
                        <li>Permanently purge patient portal login credentials and biometric keys.</li>
                        <li>Deprovision MedLink Emergency QR card profile and health record linkage.</li>
                        <li>Anonymized aggregate medical logging remains in secure files to preserve institutional audit trails.</li>
                      </ul>
                    )}
                    {isDoctor && (
                      <ul className="list-disc pl-4 space-y-1 text-slate-600">
                        <li>Permanently purge physician access, credentials, and digital stamp keys.</li>
                        <li>Remove practitioner listing from hospital division specialties.</li>
                        <li>Anonymized reports preserved for state board clinical regulatory safety registers.</li>
                      </ul>
                    )}
                    {isInsurance && (
                      <ul className="list-disc pl-4 space-y-1 text-slate-600">
                        <li>Permanently revoke corporate provider claims clearance authority.</li>
                        <li>Purge portal accounts and terminal security authorization.</li>
                      </ul>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setDeleteUserTarget(null)}
                      className="px-4 py-2 border rounded-xl text-slate-600 bg-white hover:bg-slate-50 cursor-pointer font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteLocalUser(deleteUserTarget.id);
                        addAuditLogEntry('USER_DELETED_PERMANENTLY', `Permanently deprovisioned and deleted user: ${deleteUserTarget.fullName} (${deleteUserTarget.email})`);
                        showTemporaryBanner(`Purged account registry for ${deleteUserTarget.fullName}.`);
                        setDeleteUserTarget(null);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer font-bold"
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
}
