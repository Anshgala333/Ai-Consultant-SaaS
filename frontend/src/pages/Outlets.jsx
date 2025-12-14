import { useState, useEffect } from 'react';
import { businessAPI, feedbackAPI, employeeAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { MapPin, QrCode, Plus, Download, Copy, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const Outlets = () => {
    const { isEmployee } = useAuth();
    const [loading, setLoading] = useState(true);
    const [outlets, setOutlets] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(null);
    const [newOutlet, setNewOutlet] = useState({ name: '', address: { street: '', city: '', state: '' } });

    useEffect(() => {
        fetchOutlets();
    }, []);

    const fetchOutlets = async () => {
        try {
            // Use appropriate API based on user type
            const response = isEmployee
                ? await employeeAPI.getOutlets()
                : await businessAPI.getProfile();
            setOutlets(response.data?.outlets || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
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

                {outlets.length === 0 ? (
                    <div className="empty-state card">
                        <MapPin size={48} className="text-muted" />
                        <h3>No Outlets Yet</h3>
                        <p>Add your first outlet to start collecting customer feedback</p>
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                            <Plus size={18} /> Add Outlet
                        </button>
                    </div>
                ) : (
                    <div className="outlets-grid">
                        {outlets.map(outlet => (
                            <div key={outlet._id} className="outlet-card card">
                                <div className="outlet-header">
                                    <MapPin size={20} style={{ color: 'var(--accent-primary)' }} />
                                    <h3 className="outlet-name">{outlet.name}</h3>
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
                                <label className="form-label">Outlet Name *</label>
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
                                    <label className="form-label">City</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newOutlet.address.city}
                                        onChange={e => setNewOutlet({ ...newOutlet, address: { ...newOutlet.address, city: e.target.value } })}
                                        placeholder="City"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newOutlet.address.state}
                                        onChange={e => setNewOutlet({ ...newOutlet, address: { ...newOutlet.address, state: e.target.value } })}
                                        placeholder="State"
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button className="btn btn-primary" disabled={!newOutlet.name}>Add Outlet</button>
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
                .outlets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
                .outlet-card { padding: 1.5rem; }
                .outlet-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
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
                .modal { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; padding: 2rem; width: 90%; max-width: 400px; }
                .modal h3 { margin-bottom: 1.5rem; }
                .modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
                .qr-modal { text-align: center; }
                .qr-display { margin: 1.5rem 0; }
                .qr-large { width: 200px; height: 200px; }
            `}</style>
        </div>
    );
};

export default Outlets;
