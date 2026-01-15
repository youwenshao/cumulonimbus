/**
 * Preview Runtime
 * Handles live preview rendering and component streaming
 */

import type { 
  LayoutNode, 
  Schema, 
  ComponentSpec,
  GeneratedComponent,
} from '../types';

export interface PreviewState {
  layout: LayoutNode | null;
  components: Map<string, GeneratedComponent>;
  schema: Schema | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Create initial preview state
 */
export function createPreviewState(): PreviewState {
  return {
    layout: null,
    components: new Map(),
    schema: null,
    isLoading: false,
    error: null,
  };
}

/**
 * Update preview state with a new component
 */
export function addComponentToPreview(
  state: PreviewState,
  component: GeneratedComponent
): PreviewState {
  const components = new Map(state.components);
  components.set(component.name, component);
  
  return {
    ...state,
    components,
  };
}

/**
 * Update preview layout
 */
export function updatePreviewLayout(
  state: PreviewState,
  layout: LayoutNode
): PreviewState {
  return {
    ...state,
    layout,
  };
}

/**
 * Set preview error
 */
export function setPreviewError(
  state: PreviewState,
  error: string
): PreviewState {
  return {
    ...state,
    error,
    isLoading: false,
  };
}

/**
 * Clear preview error
 */
export function clearPreviewError(state: PreviewState): PreviewState {
  return {
    ...state,
    error: null,
  };
}

/**
 * Generate preview HTML from layout and components
 */
export function generatePreviewHTML(
  layout: LayoutNode,
  components: Map<string, GeneratedComponent>,
  schema: Schema
): string {
  const componentScripts = Array.from(components.values())
    .map(c => c.code)
    .join('\n\n');

  const layoutJSON = JSON.stringify(layout);
  const schemaJSON = JSON.stringify(schema);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>App Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a; /* surface-dark */
      color: #ffffff; /* text-primary */
    }
    
    .preview-container {
      padding: 1.5rem;
    }
    
    .layout-row {
      display: flex;
      flex-direction: row;
      gap: 1rem;
    }
    
    .layout-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .layout-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }
    
    .component-wrapper {
      background: #1a1a1a; /* surface-light */
      border: 1px solid #333333; /* outline-mid */
      border-radius: 8px;
      padding: 1rem;
    }

    .component-placeholder {
      background: #1a1a1a; /* surface-light */
      border: 2px dashed #333333; /* outline-mid */
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      color: #888888; /* text-tertiary */
    }
    
    /* Form styles */
    .preview-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .form-field label {
      font-size: 0.875rem;
      color: #999;
    }
    
    .form-field input,
    .form-field select,
    .form-field textarea {
      padding: 0.5rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #fff;
      font-size: 1rem;
    }
    
    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {
      outline: none;
      border-color: #f43f5e;
    }
    
    .submit-button {
      padding: 0.75rem 1.5rem;
      background: #f43f5e;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .submit-button:hover {
      background: #e11d48;
    }
    
    /* Table styles */
    .preview-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .preview-table th,
    .preview-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #333;
    }
    
    .preview-table th {
      background: #1a1a1a;
      color: #999;
      font-weight: 500;
    }
    
    .preview-table tbody tr:hover {
      background: #1a1a1a;
    }
    
    /* Stats styles */
    .preview-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }
    
    .stat-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #f43f5e;
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: #666;
    }
    
    /* Chart placeholder */
    .chart-placeholder {
      height: 200px;
      background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
    }
    
    @media (max-width: 768px) {
      .layout-row {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    const { useState, useEffect } = React;
    
    // Schema and layout data
    const schema = ${schemaJSON};
    const layoutData = ${layoutJSON};
    
    // Sample data for preview
    const sampleData = generateSampleData(schema, 5);
    
    function generateSampleData(schema, count) {
      const data = [];
      for (let i = 0; i < count; i++) {
        const record = { id: 'sample-' + (i + 1) };
        schema.fields.forEach(field => {
          if (field.generated) return;
          record[field.name] = generateFieldValue(field, i);
        });
        data.push(record);
      }
      return data;
    }
    
    function generateFieldValue(field, index) {
      switch (field.type) {
        case 'number':
          return Math.floor(Math.random() * 100) + 1;
        case 'boolean':
          return Math.random() > 0.5;
        case 'date':
        case 'datetime':
          const date = new Date();
          date.setDate(date.getDate() - index);
          return date.toISOString().split('T')[0];
        case 'enum':
          return field.options?.[index % field.options.length] || 'Option';
        default:
          return field.label + ' ' + (index + 1);
      }
    }
    
    // Form Component
    function PreviewForm({ fields }) {
      const [formData, setFormData] = useState({});
      
      const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        setFormData({});
      };
      
      const schemaFields = schema.fields.filter(f => !f.generated);
      
      return (
        <div className="component-wrapper">
          <form className="preview-form" onSubmit={handleSubmit}>
            {schemaFields.map(field => (
              <div key={field.name} className="form-field">
                <label>{field.label}{field.required && ' *'}</label>
                {field.type === 'enum' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                  >
                    <option value="">Select...</option>
                    {(field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'text' ? (
                  <textarea
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
            <button type="submit" className="submit-button">Add Entry</button>
          </form>
        </div>
      );
    }
    
    // Table Component
    function PreviewTable({ columns, data = sampleData }) {
      const schemaFields = schema.fields.filter(f => !f.generated);
      
      return (
        <div className="component-wrapper">
          <table className="preview-table">
            <thead>
              <tr>
                {schemaFields.map(field => (
                  <th key={field.name}>{field.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {schemaFields.map(field => (
                    <td key={field.name}>
                      {field.type === 'boolean' 
                        ? (row[field.name] ? '✓' : '✗')
                        : String(row[field.name] ?? '')}
                    </td>
                  ))}
                  <td>
                    <button style={{background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer'}}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    // Stats Component
    function PreviewStats({ metrics }) {
      const numericFields = schema.fields.filter(f => f.type === 'number' && !f.generated);
      
      return (
        <div className="preview-stats">
          <div className="stat-card">
            <div className="stat-value">{sampleData.length}</div>
            <div className="stat-label">Total Entries</div>
          </div>
          {numericFields.slice(0, 2).map(field => (
            <div key={field.name} className="stat-card">
              <div className="stat-value">
                {sampleData.reduce((sum, row) => sum + (row[field.name] || 0), 0)}
              </div>
              <div className="stat-label">Total {field.label}</div>
            </div>
          ))}
        </div>
      );
    }
    
    // Chart Placeholder
    function PreviewChart({ chartType = 'bar' }) {
      return (
        <div className="component-wrapper">
          <div className="chart-placeholder">
            📊 {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
            <br />
            <small>(Chart rendering in preview)</small>
          </div>
        </div>
      );
    }
    
    // Cards Component
    function PreviewCards({ data = sampleData }) {
      return (
        <div className="component-wrapper">
          <div className="layout-grid">
            {data.map((item, i) => (
              <div key={i} className="stat-card">
                <div style={{fontWeight: 'bold'}}>{item[schema.fields[1]?.name] || 'Item'}</div>
                <div style={{color: '#666', fontSize: '0.875rem'}}>
                  {Object.entries(item).slice(1, 3).map(([k, v]) => (
                    <div key={k}>{String(v)}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Component placeholder
    function ComponentPlaceholder({ type }) {
      return (
        <div className="component-placeholder">
          {type.charAt(0).toUpperCase() + type.slice(1)} Component
        </div>
      );
    }
    
    // Layout Renderer
    function LayoutRenderer({ node }) {
      if (!node) return null;
      
      if (node.type === 'container' && node.container) {
        const { direction, children, gap } = node.container;
        const className = 'layout-' + direction;
        
        return (
          <div className={className} style={{ gap }}>
            {(children || []).map((child, i) => (
              <LayoutRenderer key={child.id || i} node={child} />
            ))}
          </div>
        );
      }
      
      if (node.type === 'component' && node.component) {
        const { type, props } = node.component;
        
        switch (type) {
          case 'form':
            return <PreviewForm {...props} />;
          case 'table':
            return <PreviewTable {...props} />;
          case 'chart':
            return <PreviewChart {...props} />;
          case 'stats':
            return <PreviewStats {...props} />;
          case 'cards':
            return <PreviewCards {...props} />;
          default:
            return <ComponentPlaceholder type={type} />;
        }
      }
      
      return null;
    }
    
    // Main App
    function App() {
      return (
        <div className="preview-container">
          <LayoutRenderer node={layoutData} />
        </div>
      );
    }
    
    ReactDOM.render(<App />, document.getElementById('root'));
  </script>
</body>
</html>
`;
}

/**
 * Generate a minimal preview HTML for schema only (no layout yet)
 */
export function generateSchemaPreviewHTML(schema: Schema): string {
  const fields = schema.fields.filter(f => !f.generated);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0a0a0a;
      color: #fff;
      padding: 1.5rem;
      margin: 0;
    }
    .schema-preview {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
    }
    h2 { margin-top: 0; color: #f43f5e; }
    .field {
      padding: 0.75rem 0;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
    }
    .field:last-child { border-bottom: none; }
    .field-name { font-weight: 500; }
    .field-type { color: #666; font-size: 0.875rem; }
    .required { color: #f43f5e; }
  </style>
</head>
<body>
  <div class="schema-preview">
    <h2>${schema.label}</h2>
    <p style="color: #666">${schema.description || ''}</p>
    <div class="fields">
      ${fields.map(f => `
        <div class="field">
          <span class="field-name">
            ${f.label}
            ${f.required ? '<span class="required">*</span>' : ''}
          </span>
          <span class="field-type">${f.type}</span>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
`;
}
