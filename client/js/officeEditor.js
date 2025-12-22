// Simple File Viewer - READ ONLY (No editing)
let currentViewingFile = null;

// Open file in viewer (NO EDIT)
async function openOfficeFile(fileId, fileName) {
    try {
        console.log('📂 Opening file:', fileName);
        
        // Show modal with loading
        showFileViewerModal(fileName, 'loading');
        
        // Download file
        const response = await fetch(`${API_URL}/files/download/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        
        // Store current file info
        currentViewingFile = {
            id: fileId,
            name: fileName,
            blob: blob
        };

        // Determine file type and load appropriate viewer
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeType = blob.type;
        
        console.log('File type:', ext, 'MIME:', mimeType);
        
        // Route to correct viewer based on file type
        if (['doc', 'docx'].includes(ext)) {
            await loadWordViewer(blob, fileName);
        } else if (['xls', 'xlsx'].includes(ext)) {
            await loadExcelViewer(blob, fileName);
        } else if (ext === 'pdf') {
            loadPDFViewer(blob, fileName);
        } else if (['ppt', 'pptx'].includes(ext)) {
            loadPowerPointViewer(blob, fileName);
        } else if (['txt', 'log', 'md', 'json', 'xml', 'csv', 'js', 'html', 'css'].includes(ext) || 
                   mimeType.startsWith('text/')) {
            await loadTextViewer(blob, fileName);
        } else if (mimeType.startsWith('image/')) {
            loadImageViewer(blob, fileName);
        } else {
            // Other files - just download
            throw new Error('FILE_NOT_VIEWABLE');
        }

        console.log('✅ File viewer loaded');

    } catch (error) {
        console.error('❌ Open file error:', error);
        closeFileViewer();
        
        if (error.message === 'FILE_NOT_VIEWABLE') {
            const download = confirm(`📄 "${fileName}" không thể xem trực tiếp.\n\nBạn có muốn tải về không?`);
            if (download) {
                downloadFile(fileId, fileName);
            }
        } else {
            let errorMsg = '❌ Không thể mở file!\n\n';
            
            if (error.message.includes('403')) {
                errorMsg += '🔐 Bạn không có quyền truy cập.';
            } else if (error.message.includes('404')) {
                errorMsg += '📂 File không tồn tại.';
            } else {
                errorMsg += `Chi tiết: ${error.message}\n\n💡 Thử tải file về để xem.`;
            }
            
            alert(errorMsg);
        }
    }
}

// Load Word document viewer (READ ONLY)
async function loadWordViewer(blob, fileName) {
    try {
        const arrayBuffer = await blob.arrayBuffer();
        
        // Convert DOCX to HTML using Mammoth
        const result = await mammoth.convertToHtml({arrayBuffer: arrayBuffer});
        const html = result.value;
        
        if (!html || html.trim() === '') {
            throw new Error('File rỗng hoặc không thể đọc');
        }
        
        // Create simple HTML viewer
        const viewerBody = document.getElementById('fileViewerBody');
        viewerBody.innerHTML = `
            <div style="padding: 40px; max-width: 800px; margin: 0 auto; background: white; min-height: 100%; overflow-y: auto;">
                <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
                    ${html}
                </div>
            </div>
        `;
        
        console.log('✅ Word viewer loaded');
        
    } catch (error) {
        console.error('❌ Load Word error:', error);
        throw new Error('Không thể đọc file Word. File có thể bị lỗi hoặc được mã hóa.');
    }
}

// Load Excel viewer (READ ONLY)
async function loadExcelViewer(blob, fileName) {
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        // Read Excel file
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to HTML table
        const html = XLSX.utils.sheet_to_html(worksheet);
        
        // Create viewer with sheet selector
        const viewerBody = document.getElementById('fileViewerBody');
        viewerBody.innerHTML = `
            <div style="padding: 20px; background: #f5f5f5; height: 100%; overflow: auto;">
                <div style="padding: 10px; background: white; margin-bottom: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Sheet:</strong> 
                        <select id="sheetSelector" onchange="switchExcelSheet()" style="padding: 5px; margin-left: 10px;">
                            ${workbook.SheetNames.map((name, i) => 
                                `<option value="${i}" ${i === 0 ? 'selected' : ''}>${name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div id="excelTableContainer" style="overflow: auto; background: white; padding: 20px; border-radius: 5px;">
                    ${html}
                </div>
            </div>
        `;
        
        // Store workbook for sheet switching
        window._currentWorkbook = workbook;
        
        // Style the table
        const table = viewerBody.querySelector('table');
        if (table) {
            table.style.cssText = 'border-collapse: collapse; width: 100%;';
            const cells = table.querySelectorAll('td, th');
            cells.forEach(cell => {
                cell.style.cssText = 'border: 1px solid #ddd; padding: 8px 12px; text-align: left;';
            });
            const headers = table.querySelectorAll('th');
            headers.forEach(th => {
                th.style.cssText += 'background: #34495e; color: white; font-weight: bold;';
            });
        }
        
        console.log('✅ Excel viewer loaded');
        
    } catch (error) {
        console.error('❌ Load Excel error:', error);
        throw new Error('Không thể đọc file Excel. File có thể bị lỗi.');
    }
}

// Switch Excel sheet
function switchExcelSheet() {
    const selector = document.getElementById('sheetSelector');
    const sheetIndex = parseInt(selector.value);
    const workbook = window._currentWorkbook;
    
    if (!workbook) return;
    
    const sheetName = workbook.SheetNames[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    const html = XLSX.utils.sheet_to_html(worksheet);
    
    const container = document.getElementById('excelTableContainer');
    container.innerHTML = html;
    
    // Re-style the table
    const table = container.querySelector('table');
    if (table) {
        table.style.cssText = 'border-collapse: collapse; width: 100%;';
        const cells = table.querySelectorAll('td, th');
        cells.forEach(cell => {
            cell.style.cssText = 'border: 1px solid #ddd; padding: 8px 12px; text-align: left;';
        });
        const headers = table.querySelectorAll('th');
        headers.forEach(th => {
            th.style.cssText += 'background: #34495e; color: white; font-weight: bold;';
        });
    }
}

// Load PDF viewer (READ ONLY)
function loadPDFViewer(blob, fileName) {
    const viewerBody = document.getElementById('fileViewerBody');
    const blobUrl = URL.createObjectURL(blob);
    
    viewerBody.innerHTML = `
        <div style="width: 100%; height: 100%; background: #525252;">
            <iframe src="${blobUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
        </div>
    `;
    
    console.log('✅ PDF viewer loaded');
}

// Load PowerPoint viewer (READ ONLY)
function loadPowerPointViewer(blob, fileName) {
    const viewerBody = document.getElementById('fileViewerBody');
    
    viewerBody.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center; background: #f5f5f5;">
            <div style="font-size: 64px; margin-bottom: 20px;">📊</div>
            <h2 style="margin-bottom: 10px; color: #2c3e50;">${fileName}</h2>
            <p style="color: #666; margin-bottom: 30px; max-width: 500px;">
                PowerPoint files không thể xem trực tiếp trong trình duyệt.<br>
                Vui lòng tải file về để xem bằng Microsoft PowerPoint, Google Slides, hoặc LibreOffice.
            </p>
            <button onclick="downloadCurrentFile()" style="padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                ⬇️ Tải về ngay
            </button>
        </div>
    `;
    
    console.log('✅ PowerPoint message displayed');
}

// Load Text file viewer (READ ONLY)
async function loadTextViewer(blob, fileName) {
    try {
        const text = await blob.text();
        
        const viewerBody = document.getElementById('fileViewerBody');
        viewerBody.innerHTML = `
            <div style="padding: 20px; background: #f5f5f5; height: 100%; overflow: auto;">
                <div style="background: white; padding: 30px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; color: #333;">
${text}
                </div>
            </div>
        `;
        
        console.log('✅ Text viewer loaded');
        
    } catch (error) {
        console.error('❌ Load text error:', error);
        throw new Error('Không thể đọc file text.');
    }
}

// Load Image viewer
function loadImageViewer(blob, fileName) {
    const viewerBody = document.getElementById('fileViewerBody');
    const blobUrl = URL.createObjectURL(blob);
    
    viewerBody.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #2c3e50; padding: 20px;">
            <img src="${blobUrl}" alt="${fileName}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 5px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        </div>
    `;
    
    console.log('✅ Image viewer loaded');
}

// Show file viewer modal
function showFileViewerModal(fileName, status = 'loading') {
    const modal = document.getElementById('fileViewerModal');
    const filenameEl = document.getElementById('fileViewerName');
    const bodyEl = document.getElementById('fileViewerBody');
    
    filenameEl.textContent = fileName;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (status === 'loading') {
        bodyEl.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #7f8c8d;">
                <div style="font-size: 48px; animation: spin 1s linear infinite;">⏳</div>
                <p style="margin-top: 20px; font-size: 18px;">Đang tải file...</p>
            </div>
        `;
    }
}

// Close file viewer
function closeFileViewer() {
    const modal = document.getElementById('fileViewerModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Cleanup
    currentViewingFile = null;
    window._currentWorkbook = null;
}

// Download current viewing file
function downloadCurrentFile() {
    if (!currentViewingFile) {
        alert('❌ Không có file để tải!');
        return;
    }

    const url = URL.createObjectURL(currentViewingFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentViewingFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ File downloaded:', currentViewingFile.name);
}

// Make functions global
window.openOfficeFile = openOfficeFile;
window.closeFileViewer = closeFileViewer;
window.downloadCurrentFile = downloadCurrentFile;
window.switchExcelSheet = switchExcelSheet;