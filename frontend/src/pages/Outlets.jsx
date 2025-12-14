import { useState, useEffect } from 'react';
import { businessAPI, feedbackAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { MapPin, QrCode, Plus, Download, Copy, Trash2, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

// Indian States and Cities data
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Chandigarh', 'Puducherry'
];

const CITIES_BY_STATE = {
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur'],
    'Karnataka': ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum', 'Gulbarga', 'Davangere'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bharatpur'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Ghaziabad', 'Noida'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Kharagpur'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kakinada'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur', 'Kannur'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
    'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Rohtak', 'Hisar'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon'],
    'Delhi': ['New Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'],
    'Chandigarh': ['Chandigarh'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali', 'Solan', 'Kullu'],
    'Puducherry': ['Puducherry', 'Karaikal', 'Yanam']
};

const Outlets = () => {
    const { isEmployee } = useAuth();
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [newOutlet, setNewOutlet] = useState({ name: '', address: { street: '', city: '', state: '' } });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterState, setFilterState] = useState('');
    const [filterCity, setFilterCity] = useState('');

    useEffect(() => {
        fetchOutlets();
    }, []);

    const fetchOutlets = async () => {
        try {
            // Use employee-specific endpoint if user is an employee
            const response = isEmployee 
                ? await businessAPI.getEmployeeOutlets()
                : await businessAPI.getProfile();
            setOutlets(response.data?.outlets || []);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load outlets');
        } finally {
            setLoading(false);
        }
    };

    const handleAddOutlet = async () => {
        if (!newOutlet.name.trim()) {
            toast.error('Outlet name is required');
            return;
        }

        setSubmitting(true);
        try {
            await businessAPI.addOutlet({
                name: newOutlet.name,
                address: newOutlet.address
            });
            toast.success('Outlet added successfully!');
            setShowAddModal(false);
            setNewOutlet({ name: '', address: { street: '', city: '', state: '' } });
            fetchOutlets();
        } catch (error) {
            console.error('Error:', error);
            toast.error(error.response?.data?.message || 'Failed to add outlet');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteOutlet = async (outletId) => {
        if (!confirm('Are you sure you want to delete this outlet?')) return;

        try {
            await businessAPI.deleteOutlet(outletId);
            toast.success('Outlet deleted');
            fetchOutlets();
        } catch (error) {
            toast.error('Failed to delete outlet');
        }
    };

    const handleGenerateQR = async (outletId) => {
        try {
            const response = await feedbackAPI.generateQR(outletId);
            toast.success('QR code generated!');
            setShowQRModal({ outletId, ...response.data });
            fetchOutlets();
        } catch (error) {
            toast.error('Failed to generate QR code');
        }
    };

    const handleCopyLink = (outletId) => {
        const link = `${window.location.origin}/feedback/${outletId}`;
        navigator.clipboard.writeText(link);
        toast.success('Feedback link copied!');
    };

    const handleDownloadQR = (dataUrl, outletName) => {
        if (!dataUrl) {
            toast.error('Generate QR code first');
            return;
        }
        const link = document.createElement('a');
        link.download = `qr-${outletName.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
    };

    // Get cities for selected state in modal
    const getCitiesForState = (state) => {
        return CITIES_BY_STATE[state] || [];
    };

    // Get unique states and cities from existing outlets for filters
    const getUniqueStates = () => {
        const states = outlets.map(o => o.address?.state).filter(Boolean);
        return [...new Set(states)];
    };

    const getUniqueCities = () => {
        let cities = outlets.map(o => o.address?.city).filter(Boolean);
        if (filterState) {
            cities = outlets.filter(o => o.address?.state === filterState).map(o => o.address?.city).filter(Boolean);
        }
        return [...new Set(cities)];
    };

    // Filter outlets
    const filteredOutlets = outlets.filter(outlet => {
        const matchesSearch = !searchTerm ||
            outlet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            outlet.address?.street?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesState = !filterState || outlet.address?.state === filterState;
        const matchesCity = !filterCity || outlet.address?.city === filterCity;
        return matchesSearch && matchesState && matchesCity;
    });

    if (loading) {
        return <div className="page"><div className="container"><div className="loading-state"><div className="spinner"></div></div></div></div>;
    }

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Outlets & QR Codes</h1>
                        <p className="page-subtitle">Manage your outlet locations and customer feedback QR codes</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={18} /> Add Outlet
                    </button>
                </div>

                {/* Filters */}
                {outlets.length > 0 && (
                    <div className="filter-bar">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search outlets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <Filter size={18} />
                            <select
                                className="form-select"
                                value={filterState}
                                onChange={(e) => {
                                    setFilterState(e.target.value);
                                    setFilterCity('');
                                }}
                            >
                                <option value="">All States</option>
                                {getUniqueStates().map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                            <select
                                className="form-select"
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                disabled={!filterState && getUniqueCities().length === 0}
                            >
                                <option value="">All Cities</option>
                                {getUniqueCities().map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {filteredOutlets.length === 0 ? (
                    <div className="empty-state card">
                        <MapPin size={48} className="text-muted" />
                        <h3>{outlets.length === 0 ? 'No Outlets Yet' : 'No Matching Outlets'}</h3>
                        <p>{outlets.length === 0
                            ? 'Add your first outlet to start collecting customer feedback'
                            : 'Try adjusting your filters'}</p>
                        {outlets.length === 0 && (
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                <Plus size={18} /> Add Outlet
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="outlets-grid">
                        {filteredOutlets.map(outlet => (
                            <div key={outlet._id} className="outlet-card card">
                                <div className="outlet-header">
                                    <div className="outlet-info">
                                        <MapPin size={20} style={{ color: 'var(--accent-primary)' }} />
                                        <h3 className="outlet-name">{outlet.name}</h3>
                                    </div>
                                    <button
                                        className="btn-icon delete-btn"
                                        onClick={() => handleDeleteOutlet(outlet._id)}
                                        title="Delete outlet"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {outlet.address && (
                                    <p className="outlet-address text-muted">
                                        {[outlet.address.street, outlet.address.city, outlet.address.state]
                                            .filter(Boolean).join(', ')}
                                    </p>
                                )}

                                <div className="qr-section">
                                    {outlet.qrCodeData ? (
                                        <div className="qr-preview">
                                            <img src={outlet.qrCodeData} alt="QR Code" className="qr-image" />
                                            <div className="qr-actions">
                                                <button className="btn btn-sm btn-ghost" onClick={() => handleDownloadQR(outlet.qrCodeData, outlet.name)}>
                                                    <Download size={14} /> Download
                                                </button>
                                                <button className="btn btn-sm btn-ghost" onClick={() => handleCopyLink(outlet._id)}>
                                                    <Copy size={14} /> Copy Link
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="btn btn-secondary w-full" onClick={() => handleGenerateQR(outlet._id)}>
                                            <QrCode size={18} /> Generate QR Code
                                        </button>
                                    )}
                                </div>

                                <div className="outlet-stats">
                                    <div className="stat">
                                        <span className="label">Feedback Count</span>
                                        <span className="value">{outlet.feedbackCount || 0}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="label">Avg Rating</span>
                                        <span className="value">{outlet.avgRating?.toFixed(1) || '-'} ★</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Outlet Modal */}
                {showAddModal && (
                    <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h3>Add New Outlet</h3>
                            <div className="form-group">
                                <label className="form-label">Outlet Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newOutlet.name}
                                    onChange={e => setNewOutlet({ ...newOutlet, name: e.target.value })}
                                    placeholder="e.g., Main Branch"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Street Address</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newOutlet.address.street}
                                    onChange={e => setNewOutlet({ ...newOutlet, address: { ...newOutlet.address, street: e.target.value } })}
                                    placeholder="123 Main St"
                                />
                            </div>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">State</label>
                                    <select
                                        className="form-select"
                                        value={newOutlet.address.state}
                                        onChange={e => setNewOutlet({
                                            ...newOutlet,
                                            address: { ...newOutlet.address, state: e.target.value, city: '' }
                                        })}
                                    >
                                        <option value="">Select State</option>
                                        {INDIAN_STATES.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <select
                                        className="form-select"
                                        value={newOutlet.address.city}
                                        onChange={e => setNewOutlet({ ...newOutlet, address: { ...newOutlet.address, city: e.target.value } })}
                                        disabled={!newOutlet.address.state}
                                    >
                                        <option value="">Select City</option>
                                        {getCitiesForState(newOutlet.address.state).map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAddOutlet}
                                    disabled={!newOutlet.name.trim() || submitting}
                                >
                                    {submitting ? 'Adding...' : 'Add Outlet'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* QR Code Modal */}
                {showQRModal && (
                    <div className="modal-overlay" onClick={() => setShowQRModal(null)}>
                        <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
                            <h3>QR Code Generated!</h3>
                            <div className="qr-display">
                                <img src={showQRModal.qrCodeDataUrl} alt="QR Code" className="qr-large" />
                            </div>
                            <p className="text-center text-muted mb-md">
                                Customers can scan this code to leave feedback
                            </p>
                            <div className="flex gap-md justify-center">
                                <button className="btn btn-primary" onClick={() => handleDownloadQR(showQRModal.qrCodeDataUrl, 'outlet')}>
                                    <Download size={18} /> Download QR
                                </button>
                                <button className="btn btn-secondary" onClick={() => handleCopyLink(showQRModal.outletId)}>
                                    <Copy size={18} /> Copy Link
                                </button>
                            </div>
                            <button className="btn btn-ghost mt-md w-full" onClick={() => setShowQRModal(null)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .outlets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
                .outlet-card { padding: 1.5rem; }
                .outlet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
                .outlet-info { display: flex; align-items: center; gap: 0.75rem; }
                .outlet-name { margin: 0; font-size: 1.125rem; }
                .outlet-address { font-size: 0.875rem; margin-bottom: 1rem; }
                .qr-section { margin: 1rem 0; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px; }
                .qr-preview { text-align: center; }
                .qr-image { width: 120px; height: 120px; margin-bottom: 0.75rem; }
                .qr-actions { display: flex; gap: 0.5rem; justify-content: center; }
                .outlet-stats { display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); }
                .outlet-stats .stat { flex: 1; text-align: center; }
                .outlet-stats .label { display: block; font-size: 0.75rem; color: var(--text-muted); }
                .outlet-stats .value { font-size: 1.25rem; font-weight: 600; }
                .empty-state { text-align: center; padding: 4rem 2rem; }
                .empty-state h3 { margin: 1rem 0 0.5rem; }
                .empty-state p { color: var(--text-muted); margin-bottom: 1.5rem; }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .modal { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 2rem; width: 90%; max-width: 480px; }
                .modal h3 { margin-bottom: 1.5rem; }
                .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
                .qr-modal { text-align: center; }
                .qr-display { margin: 1.5rem 0; }
                .qr-large { width: 200px; height: 200px; }
                .required { color: var(--danger); }
                .btn-icon { background: none; border: none; padding: 0.5rem; border-radius: 8px; cursor: pointer; color: var(--text-muted); transition: all 0.2s; }
                .btn-icon:hover { background: var(--bg-tertiary); }
                .delete-btn:hover { color: var(--danger); background: rgba(239, 68, 68, 0.1); }
                
                /* Filter Bar */
                .filter-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
                .search-box { display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 200px; position: relative; }
                .search-box svg { position: absolute; left: 12px; color: var(--text-muted); }
                .search-box .form-input { padding-left: 40px; }
                .filter-group { display: flex; align-items: center; gap: 0.5rem; }
                .filter-group svg { color: var(--text-muted); }
                .filter-group .form-select { min-width: 150px; }
                
                @media (max-width: 768px) {
                    .filter-bar { flex-direction: column; }
                    .search-box { width: 100%; }
                    .filter-group { width: 100%; }
                    .filter-group .form-select { flex: 1; }
                }
            `}</style>
        </div>
    );
};

export default Outlets;
