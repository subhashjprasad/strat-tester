import React from 'react';
import { Editor } from '@monaco-editor/react';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange }) => {
  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className="code-editor">
      <div className="editor-header">
        <span className="language-label">Python</span>
      </div>
      
      <div className="editor-container">
        <Editor
          height="400px"
          defaultLanguage="python"
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            fontFamily: 'Mononoki, Monaco, Menlo, Ubuntu Mono, monospace',
            fontLigatures: false,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;