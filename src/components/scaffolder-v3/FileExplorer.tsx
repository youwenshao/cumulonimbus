'use client';

import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  FileCode, 
  FileJson, 
  FileType,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileInfo {
  path: string;
  size: number;
}

interface FileExplorerProps {
  files: FileInfo[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  className?: string;
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
  size?: number;
}

/**
 * Build tree structure from flat file list
 */
function buildFileTree(files: FileInfo[]): TreeNode[] {
  const root: TreeNode[] = [];
  
  for (const file of files) {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      
      let existing = currentLevel.find(n => n.name === part);
      
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          isDirectory: !isLast,
          children: [],
          size: isLast ? file.size : undefined,
        };
        currentLevel.push(existing);
      }
      
      currentLevel = existing.children;
    }
  }
  
  // Sort: directories first, then alphabetically
  function sortTree(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: sortTree(node.children),
    }));
  }
  
  return sortTree(root);
}

/**
 * Get file icon based on extension
 */
function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-400" />;
    case 'css':
    case 'scss':
    case 'less':
      return <FileType className="w-4 h-4 text-purple-400" />;
    case 'html':
      return <FileType className="w-4 h-4 text-orange-400" />;
    case 'md':
      return <File className="w-4 h-4 text-text-tertiary" />;
    default:
      return <File className="w-4 h-4 text-text-tertiary" />;
  }
}

/**
 * Format file size
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Tree node component
 */
function TreeNodeItem({
  node,
  depth,
  selectedFile,
  expandedDirs,
  onToggleDir,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedFile === node.path;
  
  const handleClick = () => {
    if (node.isDirectory) {
      onToggleDir(node.path);
    } else {
      onSelectFile(node.path);
    }
  };
  
  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
          "hover:bg-surface-elevated",
          isSelected && "bg-accent-yellow/20 text-accent-yellow"
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {node.isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" /> {/* Spacer for alignment */}
            {getFileIcon(node.name)}
          </>
        )}
        <span className={cn(
          "truncate flex-1 text-left",
          isSelected ? "text-accent-yellow" : "text-text-primary"
        )}>
          {node.name}
        </span>
        {node.size !== undefined && (
          <span className="text-xs text-text-tertiary flex-shrink-0">
            {formatSize(node.size)}
          </span>
        )}
      </button>
      
      {/* Children */}
      {node.isDirectory && isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedDirs={expandedDirs}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * File explorer component
 */
export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  className,
}: FileExplorerProps) {
  // Build tree structure
  const tree = useMemo(() => buildFileTree(files), [files]);
  
  // Track expanded directories (default: expand src)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(['src', 'src/components', 'src/pages', 'src/lib'])
  );
  
  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };
  
  if (files.length === 0) {
    return (
      <div className={cn("p-4 text-center text-text-tertiary", className)}>
        <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No files yet</p>
        <p className="text-xs">Start chatting to generate code</p>
      </div>
    );
  }
  
  return (
    <div className={cn("py-2", className)}>
      <div className="px-3 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">
        Project Files
      </div>
      {tree.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          expandedDirs={expandedDirs}
          onToggleDir={toggleDir}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

export default FileExplorer;
