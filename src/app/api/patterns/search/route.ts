import { NextRequest, NextResponse } from 'next/server';
import { searchJobPatterns, findSimilarPatterns } from '@/lib/job-patterns';
import type { PatternSearchCriteria } from '@/types/archival';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      searchType = 'criteria', // 'criteria' or 'similarity'
      criteria,
      targetData,
      maxResults = 20
    } = body;
    
    if (searchType === 'similarity') {
      // Find similar patterns for job creation
      if (!targetData) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Target data required for similarity search' 
          },
          { status: 400 }
        );
      }
      
      const similarPatterns = await findSimilarPatterns(targetData);
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'similarity',
          patterns: similarPatterns,
          count: similarPatterns.length
        }
      });
    } else {
      // Search by criteria
      const searchCriteria: PatternSearchCriteria = criteria || {};
      const patterns = await searchJobPatterns(searchCriteria, maxResults);
      
      return NextResponse.json({
        success: true,
        data: {
          type: 'criteria',
          patterns,
          count: patterns.length,
          criteria: searchCriteria
        }
      });
    }
    
  } catch (error) {
    console.error('Error searching patterns:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search patterns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const partNumber = searchParams.get('partNumber');
    const qualityLevel = searchParams.get('qualityLevel');
    const minQualityScore = searchParams.get('minQualityScore');
    const maxResults = parseInt(searchParams.get('maxResults') || '20');
    
    // Build search criteria
    const criteria: PatternSearchCriteria = {};
    
    if (partNumber) criteria.partNumber = partNumber;
    if (qualityLevel && qualityLevel !== 'all') {
      criteria.qualityLevel = [qualityLevel as any];
    }
    if (minQualityScore) {
      criteria.minQualityScore = parseFloat(minQualityScore);
    }
    
    const patterns = await searchJobPatterns(criteria, maxResults);
    
    return NextResponse.json({
      success: true,
      data: {
        patterns,
        count: patterns.length,
        criteria
      }
    });
    
  } catch (error) {
    console.error('Error in GET patterns search:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search patterns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 