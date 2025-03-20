document.addEventListener('DOMContentLoaded', () => {
    // Load default checklist on startup
    fetch('default-checklist.md')
        .then(response => response.text())
        .then(markdown => {
            loadChecklistFromMarkdown(markdown);
            document.getElementById('markdownEditor').value = markdown;
            // Load saved checklists from cookies
            loadSavedChecklists();
        })
        .catch(error => console.error('Error loading default checklist:', error));

    // Event Listeners
    document.getElementById('saveBtn').addEventListener('click', saveCurrentChecklist);
    document.getElementById('saveAsNewBtn').addEventListener('click', saveAsNewChecklist);
    document.getElementById('deleteCurrentBtn').addEventListener('click', deleteCurrentChecklist);
    document.getElementById('downloadBtn').addEventListener('click', downloadChecklist);
    document.getElementById('resetBtn').addEventListener('click', resetChecklist);
    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('uploadInput').click();
    });
    document.getElementById('uploadInput').addEventListener('change', handleFileUpload);
    document.getElementById('updateFromEditor').addEventListener('click', updateFromEditor);
    document.getElementById('checklistSelect').addEventListener('change', loadSelectedChecklist);

    // Handle checklist item clicks
    document.getElementById('checklist').addEventListener('click', (e) => {
        if (e.target.classList.contains('checklist-item')) {
            e.target.classList.toggle('checked');
            updateEditorFromChecklist();
        }
    });
});

function loadChecklistFromMarkdown(markdown) {
    const lines = markdown.split('\n');
    const checklistContainer = document.getElementById('checklist');
    checklistContainer.innerHTML = '';
    
    lines.forEach(line => {
        if (line.trim() === '') return;
        
        if (line.startsWith('# ')) {
            // Main title
            const title = document.createElement('h2');
            title.textContent = line.substring(2);
            checklistContainer.appendChild(title);
        } else if (line.startsWith('## ')) {
            // Section header
            const header = document.createElement('div');
            header.className = 'section-header';
            header.textContent = line.substring(3);
            checklistContainer.appendChild(header);
        } else if (line.startsWith('- ')) {
            // Checklist item (simplified format)
            const item = document.createElement('div');
            item.className = 'checklist-item';
            item.textContent = line.substring(2);
            checklistContainer.appendChild(item);
        }
    });
}

function updateEditorFromChecklist() {
    const checklist = document.getElementById('checklist');
    let markdown = '';
    
    Array.from(checklist.children).forEach(element => {
        if (element.tagName === 'H2') {
            markdown += `# ${element.textContent}\n\n`;
        } else if (element.classList.contains('section-header')) {
            markdown += `## ${element.textContent}\n`;
        } else if (element.classList.contains('checklist-item')) {
            markdown += `- ${element.textContent}\n`;
        }
    });
    
    document.getElementById('markdownEditor').value = markdown;
}

function updateFromEditor() {
    const markdown = document.getElementById('markdownEditor').value;
    loadChecklistFromMarkdown(markdown);
    saveCurrentChecklist();
}

function loadSavedChecklists() {
    const select = document.getElementById('checklistSelect');
    const savedChecklists = getAllSavedChecklists();
    
    // Clear existing options except default
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add saved checklists to select
    Object.keys(savedChecklists).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

function getAllSavedChecklists() {
    const cookies = document.cookie.split(';');
    const checklists = {};
    
    cookies.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name.startsWith('checklist_')) {
            const checklistName = decodeURIComponent(name.substring(10));
            try {
                checklists[checklistName] = JSON.parse(decodeURIComponent(value));
            } catch (e) {
                console.error('Error parsing checklist:', checklistName);
            }
        }
    });
    
    return checklists;
}

function saveCurrentChecklist() {
    const select = document.getElementById('checklistSelect');
    const currentName = select.value;
    if (currentName === 'default') {
        saveAsNewChecklist();
        return;
    }
    
    const markdown = document.getElementById('markdownEditor').value;
    document.cookie = `checklist_${encodeURIComponent(currentName)}=${encodeURIComponent(JSON.stringify(markdown))}; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}`;
    alert('Checklist saved!');
}

function saveAsNewChecklist() {
    const nameInput = document.getElementById('newChecklistName');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Please enter a name for the new checklist');
        return;
    }
    
    const markdown = document.getElementById('markdownEditor').value;
    document.cookie = `checklist_${encodeURIComponent(name)}=${encodeURIComponent(JSON.stringify(markdown))}; expires=${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()}`;
    
    // Update select options
    loadSavedChecklists();
    
    // Select the new checklist
    document.getElementById('checklistSelect').value = name;
    nameInput.value = '';
    
    alert('New checklist saved!');
}

function deleteCurrentChecklist() {
    const select = document.getElementById('checklistSelect');
    const currentName = select.value;
    
    if (currentName === 'default') {
        alert('Cannot delete the default checklist');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the checklist "${currentName}"?`)) {
        document.cookie = `checklist_${encodeURIComponent(currentName)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        loadSavedChecklists();
        select.value = 'default';
        fetch('default-checklist.md')
            .then(response => response.text())
            .then(markdown => {
                loadChecklistFromMarkdown(markdown);
                document.getElementById('markdownEditor').value = markdown;
            });
    }
}

function loadSelectedChecklist() {
    const select = document.getElementById('checklistSelect');
    const currentName = select.value;
    
    if (currentName === 'default') {
        fetch('default-checklist.md')
            .then(response => response.text())
            .then(markdown => {
                loadChecklistFromMarkdown(markdown);
                document.getElementById('markdownEditor').value = markdown;
            });
        return;
    }
    
    const savedChecklists = getAllSavedChecklists();
    if (savedChecklists[currentName]) {
        const markdown = savedChecklists[currentName];
        loadChecklistFromMarkdown(markdown);
        document.getElementById('markdownEditor').value = markdown;
    }
}

function downloadChecklist() {
    const select = document.getElementById('checklistSelect');
    const currentName = select.value;
    const markdown = document.getElementById('markdownEditor').value;
    
    // Create a safe filename from the checklist name
    const filename = (currentName === 'default' ? 'Cessna-172-Pre-Start' : currentName)
        .replace(/[^a-z0-9]/gi, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/-+/g, '-')         // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '')       // Remove leading/trailing hyphens
        .toLowerCase() + '.md';
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const markdown = e.target.result;
            loadChecklistFromMarkdown(markdown);
            document.getElementById('markdownEditor').value = markdown;
        };
        reader.readAsText(file);
    }
    event.target.value = ''; // Reset file input
}

function resetChecklist() {
    if (confirm('Are you sure you want to clear all checked items?')) {
        const items = document.getElementsByClassName('checklist-item');
        Array.from(items).forEach(item => {
            item.classList.remove('checked');
        });
        updateEditorFromChecklist();
    }
} 