'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import UnifiedArchiveInterface from '@/components/manufacturing/UnifiedArchiveInterface';

export default function ArchiveIntelligencePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Archive Intelligence"
        description="Access and analyze historical manufacturing data to make informed production decisions"
      />
      
      <UnifiedArchiveInterface
        mode="panel"
        showStatistics={true}
        showIntelligence={true}
        showArchiveTable={true}
        enableSearch={true}
        initialLoad={true}
        partName="*"
      />
    </div>
  );
} 