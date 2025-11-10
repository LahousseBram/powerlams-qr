// QR Code Manager Application
const SECURITY_CODE = "admin123"; // Change this to your desired security code
let qrCodes = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadQRCodes();
    setupEventListeners();
});

// Load QR codes from API
async function loadQRCodes() {
    try {
        const response = await fetch('/api/qr-codes');
        if (response.ok) {
            qrCodes = await response.json();
            renderQRGrid();
        } else {
            console.error('Failed to load QR codes');
            renderQRGrid();
        }
    } catch (error) {
        console.error('Error loading QR codes:', error);
        renderQRGrid();
    }
}

// Save QR codes to API
async function saveQRCodes(securityCode = SECURITY_CODE) {
    try {
        const response = await fetch('/api/qr-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ qrCodes, securityCode })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save');
        }

        return true;
    } catch (error) {
        console.error('Error saving QR codes:', error);
        alert('Failed to save QR codes: ' + error.message);
        return false;
    }
}

// Generate random ID
function generateRandomId() {
    return 'QR-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Add new QR code
async function addQRCode() {
    const newQR = {
        id: generateRandomId(),
        title: '',
        documentUrl: null,
        documentType: null,
        createdAt: new Date().toISOString()
    };
    qrCodes.push(newQR);
    await saveQRCodes();
    renderQRGrid();
}

// Remove QR code
async function removeQRCode(id) {
    if (confirm('Are you sure you want to delete this QR code?')) {
        qrCodes = qrCodes.filter(qr => qr.id !== id);
        await saveQRCodes();
        renderQRGrid();
    }
}

// Render QR code grid
function renderQRGrid() {
    const grid = document.getElementById('qrGrid');
    grid.innerHTML = '';

    if (qrCodes.length === 0) {
        grid.innerHTML = '<p style="color: white; text-align: center; width: 100%; font-size: 18px;">No QR codes yet. Click "Add QR Code" to get started!</p>';
        return;
    }

    qrCodes.forEach(qr => {
        const card = createQRCard(qr);
        grid.appendChild(card);
    });
}

// Create QR code card
function createQRCard(qr) {
    const card = document.createElement('div');
    card.className = 'qr-card';

    // QR Code container
    const qrContainer = document.createElement('div');
    qrContainer.className = 'qr-code-container';

    // Generate QR code with link to redirect page
    const qrUrl = `${window.location.origin}/qr.html?id=${qr.id}`;
    new QRCode(qrContainer, {
        text: qrUrl,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.H
    });

    // QR Info
    const info = document.createElement('div');
    info.className = 'qr-info';

    const idLabel = document.createElement('div');
    idLabel.className = 'qr-id';
    idLabel.textContent = `ID: ${qr.id}`;

    const docLabel = document.createElement('div');
    docLabel.className = 'qr-document';
    docLabel.textContent = qr.documentUrl ? `Document: ${qr.documentUrl.substring(0, 30)}...` : 'No document linked';

    info.appendChild(idLabel);
    info.appendChild(docLabel);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'qr-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => openEditModal(qr.id);

    const printBtn = document.createElement('button');
    printBtn.className = 'btn btn-print';
    printBtn.textContent = 'Print';
    printBtn.onclick = () => printQRCode(qr.id);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => removeQRCode(qr.id);

    actions.appendChild(editBtn);
    actions.appendChild(printBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(qrContainer);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

// Open edit modal
function openEditModal(id) {
    const qr = qrCodes.find(q => q.id === id);
    if (!qr) return;

    document.getElementById('qrId').value = qr.id;
    document.getElementById('qrTitle').value = qr.title || '';
    document.getElementById('documentUrl').value = qr.documentUrl || '';
    document.getElementById('documentFile').value = '';
    document.getElementById('securityCode').value = '';

    const modal = document.getElementById('editModal');
    modal.style.display = 'block';
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
}

// Handle edit form submission
async function handleEditSubmit(e) {
    e.preventDefault();

    const qrId = document.getElementById('qrId').value;
    const qrTitle = document.getElementById('qrTitle').value;
    const documentUrl = document.getElementById('documentUrl').value;
    const documentFile = document.getElementById('documentFile').files[0];
    const securityCode = document.getElementById('securityCode').value;

    // Validate security code
    if (securityCode !== SECURITY_CODE) {
        alert('Invalid security code!');
        return;
    }

    const qr = qrCodes.find(q => q.id === qrId);
    if (!qr) return;

    // Update title
    qr.title = qrTitle;

    // Handle file upload (convert to base64 for storage)
    if (documentFile) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            qr.documentUrl = event.target.result;
            qr.documentType = documentFile.type;
            const success = await saveQRCodes(securityCode);
            if (success) {
                renderQRGrid();
                closeEditModal();
                alert('QR code updated successfully!');
            }
        };
        reader.readAsDataURL(documentFile);
    } else if (documentUrl) {
        qr.documentUrl = documentUrl;
        qr.documentType = 'url';
        const success = await saveQRCodes(securityCode);
        if (success) {
            renderQRGrid();
            closeEditModal();
            alert('QR code updated successfully!');
        }
    } else {
        // Just save title without document
        const success = await saveQRCodes(securityCode);
        if (success) {
            renderQRGrid();
            closeEditModal();
            alert('QR code updated successfully!');
        }
    }
}

// Print QR code
function printQRCode(id) {
    const qr = qrCodes.find(q => q.id === id);
    if (!qr) return;

    // Open print page in new window
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    const qrUrl = `${window.location.origin}/qr.html?id=${qr.id}`;
    const title = qr.title || 'Scan QR Code';

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print QR Code - ${qr.id}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: white;
                }

                .print-container {
                    text-align: center;
                    padding: 40px;
                    max-width: 400px;
                }

                .title {
                    font-size: 32px;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 24px;
                    word-wrap: break-word;
                }

                .qr-wrapper {
                    background: white;
                    padding: 20px;
                    border-radius: 16px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                    display: inline-block;
                    margin-bottom: 24px;
                }

                #qrcode {
                    display: inline-block;
                }

                .qr-id {
                    font-size: 14px;
                    color: #6b7280;
                    font-family: 'Monaco', 'Courier New', monospace;
                    margin-top: 16px;
                }

                @media print {
                    body {
                        background: white;
                    }

                    .print-container {
                        padding: 0;
                    }

                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                <h1 class="title">${title}</h1>
                <div class="qr-wrapper">
                    <div id="qrcode"></div>
                </div>
                <p class="qr-id">${qr.id}</p>
            </div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <script>
                new QRCode(document.getElementById("qrcode"), {
                    text: "${qrUrl}",
                    width: 300,
                    height: 300,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });

                // Auto print after QR code is generated
                setTimeout(() => {
                    window.print();
                }, 500);
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addQRBtn').addEventListener('click', addQRCode);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
    document.getElementById('cancelBtn').addEventListener('click', closeEditModal);

    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close');

    closeBtn.addEventListener('click', closeEditModal);

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEditModal();
        }
    });
}
