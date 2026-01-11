'use client';

/**
 * ProposalSelector
 * UI component for displaying and selecting between multiple design proposals
 */

import { useState } from 'react';
import type { DesignProposal, ProposalSet } from '@/lib/scaffolder-v2/types';

interface ProposalSelectorProps {
  proposalSet: ProposalSet;
  onSelect: (proposalId: string) => void;
  onCustomize?: (proposalId: string) => void;
  className?: string;
}

export function ProposalSelector({
  proposalSet,
  onSelect,
  onCustomize,
  className = '',
}: ProposalSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    proposalSet.proposals.find(p => p.recommended)?.id || proposalSet.proposals[0]?.id || null
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (proposalId: string) => {
    setSelectedId(proposalId);
    onSelect(proposalId);
  };

  return (
    <div className={`proposal-selector ${className}`}>
      <div className="proposal-header">
        <h3>Choose your design</h3>
        <p className="proposal-reasoning">{proposalSet.reasoning}</p>
      </div>

      <div className="proposal-grid">
        {proposalSet.proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            isSelected={selectedId === proposal.id}
            isHovered={hoveredId === proposal.id}
            onSelect={() => handleSelect(proposal.id)}
            onHover={() => setHoveredId(proposal.id)}
            onLeave={() => setHoveredId(null)}
            onCustomize={onCustomize ? () => onCustomize(proposal.id) : undefined}
          />
        ))}
      </div>

      {selectedId && (
        <div className="proposal-actions">
          <button
            className="action-primary"
            onClick={() => onSelect(selectedId)}
          >
            Use this design
          </button>
          {onCustomize && (
            <button
              className="action-secondary"
              onClick={() => onCustomize(selectedId)}
            >
              Customize
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .proposal-selector {
          padding: 1rem 0;
        }

        .proposal-header {
          margin-bottom: 1rem;
        }

        .proposal-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          margin: 0 0 0.5rem 0;
        }

        .proposal-reasoning {
          font-size: 0.875rem;
          color: #888;
          margin: 0;
        }

        .proposal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .proposal-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          padding-top: 1rem;
          border-top: 1px solid #333;
        }

        .action-primary {
          padding: 0.75rem 1.5rem;
          background: #f43f5e;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .action-primary:hover {
          background: #e11d48;
        }

        .action-secondary {
          padding: 0.75rem 1.5rem;
          background: transparent;
          color: #fff;
          border: 1px solid #444;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-secondary:hover {
          border-color: #666;
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}

interface ProposalCardProps {
  proposal: DesignProposal;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
  onCustomize?: () => void;
}

function ProposalCard({
  proposal,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave,
  onCustomize,
}: ProposalCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`proposal-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {proposal.recommended && (
        <div className="recommended-badge">★ Recommended</div>
      )}

      <div className="proposal-name">{proposal.name}</div>
      
      {/* Mockup preview */}
      <div className="mockup-container">
        {proposal.mockup?.type === 'svg' ? (
          <div 
            className="mockup-svg"
            dangerouslySetInnerHTML={{ __html: proposal.mockup.content }}
          />
        ) : proposal.mockup?.type === 'ascii' ? (
          <pre className="mockup-ascii">{proposal.mockup.content}</pre>
        ) : (
          <div className="mockup-placeholder">
            <span>Preview</span>
          </div>
        )}
      </div>

      <div className="proposal-description">{proposal.description}</div>
      
      <div className="proposal-best-for">
        <span className="label">Best for:</span> {proposal.bestFor}
      </div>

      {/* Expandable details */}
      <button 
        className="details-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(!showDetails);
        }}
      >
        {showDetails ? 'Hide details' : 'Show details'}
      </button>

      {showDetails && (
        <div className="proposal-details">
          <div className="tradeoffs">
            <div className="pros">
              <span className="label">✓ Pros</span>
              <ul>
                {proposal.tradeoffs.pros.map((pro, i) => (
                  <li key={i}>{pro}</li>
                ))}
              </ul>
            </div>
            <div className="cons">
              <span className="label">✗ Cons</span>
              <ul>
                {proposal.tradeoffs.cons.map((con, i) => (
                  <li key={i}>{con}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="components">
            <span className="label">Components:</span>
            <div className="component-tags">
              {proposal.mockup?.annotations?.map((ann, i) => (
                <span key={i} className="component-tag">{ann.component}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .proposal-card {
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 12px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .proposal-card:hover {
          border-color: #444;
          background: #1f1f1f;
        }

        .proposal-card.selected {
          border-color: #f43f5e;
          background: rgba(244, 63, 94, 0.05);
        }

        .recommended-badge {
          position: absolute;
          top: -8px;
          right: 10px;
          background: #f43f5e;
          color: #fff;
          font-size: 0.625rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .proposal-name {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.75rem;
        }

        .mockup-container {
          background: #0a0a0a;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 0.75rem;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mockup-svg {
          width: 100%;
          height: auto;
        }

        .mockup-svg :global(svg) {
          width: 100%;
          height: auto;
          display: block;
        }

        .mockup-ascii {
          font-family: monospace;
          font-size: 0.5rem;
          color: #666;
          margin: 0;
          padding: 0.5rem;
          overflow: hidden;
          white-space: pre;
        }

        .mockup-placeholder {
          color: #444;
          font-size: 0.75rem;
        }

        .proposal-description {
          font-size: 0.8125rem;
          color: #999;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .proposal-best-for {
          font-size: 0.75rem;
          color: #666;
          margin-bottom: 0.75rem;
        }

        .label {
          color: #888;
          font-weight: 500;
        }

        .details-toggle {
          width: 100%;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid #333;
          border-radius: 6px;
          color: #888;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .details-toggle:hover {
          border-color: #444;
          color: #fff;
        }

        .proposal-details {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #333;
        }

        .tradeoffs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .pros .label {
          color: #22c55e;
        }

        .cons .label {
          color: #ef4444;
        }

        .tradeoffs ul {
          list-style: none;
          padding: 0;
          margin: 0.25rem 0 0 0;
        }

        .tradeoffs li {
          font-size: 0.6875rem;
          color: #888;
          margin: 0.25rem 0;
        }

        .components {
          font-size: 0.75rem;
        }

        .component-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }

        .component-tag {
          background: #2a2a2a;
          color: #888;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-size: 0.625rem;
        }
      `}</style>
    </div>
  );
}

export default ProposalSelector;
