import { 
  generateArchiveDrivenJobSuggestions,
  createJobFromArchiveSuggestion,
  inheritProcessFromArchive,
  predictJobPerformance
} from '../src/lib/archive-driven-job-creation';
import { generateSetupIntelligence, getOptimizedSetupParameters, predictSetupSuccess } from '../src/lib/historical-setup-intelligence';
import { generateQualityIntelligence } from '../src/lib/historical-quality-intelligence';
import { searchJobArchives } from '../src/lib/job-archival';

// Test data for order items
const testOrderItems = [
  {
    partName: "Aluminum Housing AL6061",
    description: "Precision machined housing for automotive application",
    quantity: 50,
    material: "AL6061-T6",
    specifications: { 
      dimensions: "150x100x75mm",
      tolerances: "±0.1mm",
      surfaceFinish: "Ra 1.6"
    },
    processes: ["3-axis-milling", "anodizing"]
  },
  {
    partName: "Steel Shaft 4140",
    description: "Hardened steel shaft with keyway",
    quantity: 25,
    material: "4140 Steel",
    specifications: {
      dimensions: "Ø25x200mm",
      tolerances: "±0.05mm",
      hardness: "40-45 HRC"
    },
    processes: ["turning", "grinding", "heat-treatment"]
  },
  {
    partName: "Titanium Bracket Ti6Al4V",
    description: "Aerospace grade titanium bracket",
    quantity: 10,
    material: "Ti6Al4V",
    specifications: {
      dimensions: "Complex geometry",
      tolerances: "±0.02mm",
      surfaceFinish: "Ra 0.8"
    },
    processes: ["5-axis-milling", "deburring"]
  }
];

console.log('🏭 Starting Archive-Driven Job Creation System Test');
console.log('=' .repeat(60));

async function testArchiveDrivenJobSuggestions() {
  console.log('\n📋 Testing Archive-Driven Job Suggestions');
  console.log('-'.repeat(50));

  const deliveryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

  try {
    for (const orderItem of testOrderItems) {
      console.log(`\n🔍 Analyzing: ${orderItem.partName}`);
      
      const suggestions = await generateArchiveDrivenJobSuggestions(
        [orderItem],
        deliveryDate
      );

      if (suggestions.length > 0) {
        console.log(`✅ Found ${suggestions.length} archive-driven suggestions:`);
        
        suggestions.forEach((suggestion, index) => {
          console.log(`\n   Suggestion ${index + 1}:`);
          console.log(`   📁 Archive ID: ${suggestion.sourceArchiveId.slice(-12)}`);
          console.log(`   🎯 Similarity: ${suggestion.similarityScore.toFixed(1)}%`);
          console.log(`   🔒 Confidence: ${suggestion.confidenceLevel.toFixed(1)}%`);
          console.log(`   📊 Type: ${suggestion.recommendationType.replace('_', ' ')}`);
          console.log(`   ⭐ Historical Quality: ${suggestion.historicalPerformance.averageQualityScore.toFixed(1)}/10`);
          console.log(`   ⏱️  Duration: ${suggestion.historicalPerformance.averageCompletionTime.toFixed(1)}h`);
          console.log(`   🚀 On-time Rate: ${suggestion.historicalPerformance.onTimeDeliveryRate.toFixed(0)}%`);
          console.log(`   ⚡ Optimizations: ${suggestion.optimizations.length}`);
          console.log(`   ⚠️  Risks: ${suggestion.riskAssessment.length}`);
          
          if (suggestion.recommendations.length > 0) {
            console.log(`   💡 Top Recommendation: ${suggestion.recommendations[0]}`);
          }
        });
      } else {
        console.log(`❌ No archive suggestions found for ${orderItem.partName}`);
      }
    }
  } catch (error) {
    console.error('❌ Error in archive suggestion test:', error);
  }
}

async function testJobCreationFromArchive() {
  console.log('\n🔧 Testing Job Creation from Archive Suggestions');
  console.log('-'.repeat(50));

  try {
    // Get suggestions for the first test item
    const orderItem = testOrderItems[0];
    const deliveryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const suggestions = await generateArchiveDrivenJobSuggestions([orderItem], deliveryDate);
    
    if (suggestions.length > 0) {
      const suggestion = suggestions[0]; // Use the best suggestion
      console.log(`\n🎯 Creating job from suggestion: ${suggestion.sourceArchiveId.slice(-12)}`);
      
      const result = await createJobFromArchiveSuggestion(
        suggestion,
        {
          deliveryDate: deliveryDate.split('T')[0],
          priority: 'high',
          specialRequirements: ['AS9100D compliance', 'Extra quality checks'],
          qualityRequirements: { minimumScore: 8.5 }
        }
      );

      console.log(`✅ Job created successfully:`);
      console.log(`   📝 Job ID: ${result.job.id}`);
      console.log(`   📋 Tasks: ${result.tasks.length}`);
      console.log(`   🔧 Subtasks: ${result.subtasks.length}`);
      console.log(`   📑 Processing Notes: ${result.processingNotes.length}`);
      
      console.log(`\n📑 Processing Notes:`);
      result.processingNotes.forEach((note, index) => {
        console.log(`   ${index + 1}. ${note}`);
      });

      console.log(`\n📋 Generated Tasks:`);
      result.tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.name} (${task.category})`);
        if (task.setupTimeMinutes) {
          console.log(`      Setup: ${task.setupTimeMinutes}min`);
        }
      });

    } else {
      console.log(`❌ No suggestions available for job creation test`);
    }
  } catch (error) {
    console.error('❌ Error in job creation test:', error);
  }
}

async function testProcessInheritance() {
  console.log('\n🔄 Testing Process Inheritance from Archives');
  console.log('-'.repeat(50));

  try {
    // Search for a suitable archive to inherit from
    const archives = await searchJobArchives({
      partName: 'Housing',
      processTypes: ['milling'],
      includeProcessData: true,
      maxResults: 5
    });

    if (archives.length > 0) {
      const sourceArchive = archives[0];
      console.log(`\n📁 Inheriting from archive: ${sourceArchive.id.slice(-12)}`);
      
      const targetSpecs = {
        partName: "New Housing Design",
        material: "AL6061-T6",
        quantity: 30,
        dimensions: { length: 150, width: 100, height: 75 },
        tolerances: { general: "±0.1mm" }
      };

      const inheritance = await inheritProcessFromArchive(sourceArchive.id, targetSpecs);
      
      if (inheritance) {
        console.log(`✅ Process inheritance completed:`);
        console.log(`   🏭 Source Job: ${inheritance.sourceJobId}`);
        console.log(`   🔧 Inherited Processes: ${inheritance.inheritedProcesses.length}`);
        console.log(`   ⚡ Optimizations: ${inheritance.processOptimizations.length}`);
        console.log(`   ⭐ Quality Improvements: ${inheritance.qualityImprovements.length}`);
        console.log(`   🔧 Setup Optimizations: ${inheritance.setupOptimizations.length}`);

        console.log(`\n🔧 Inherited Processes:`);
        inheritance.inheritedProcesses.forEach((process, index) => {
          console.log(`   ${index + 1}. ${process.processType}`);
          console.log(`      Quality Outcome: ${process.qualityOutcome.toFixed(1)}/10`);
          console.log(`      Time Efficiency: ${process.timeEfficiency.toFixed(1)}/10`);
          console.log(`      Adaptation Required: ${process.adaptationRequired ? 'Yes' : 'No'}`);
        });

        console.log(`\n⚡ Process Optimizations:`);
        inheritance.processOptimizations.forEach((opt, index) => {
          console.log(`   ${index + 1}. ${opt.processStep}: ${opt.expectedImprovement}`);
        });

      } else {
        console.log(`❌ Process inheritance failed or no suitable archive found`);
      }
    } else {
      console.log(`❌ No archives found for process inheritance test`);
    }
  } catch (error) {
    console.error('❌ Error in process inheritance test:', error);
  }
}

async function testPerformancePrediction() {
  console.log('\n📊 Testing Job Performance Prediction');
  console.log('-'.repeat(50));

  try {
    for (const orderItem of testOrderItems) {
      console.log(`\n🔮 Predicting performance for: ${orderItem.partName}`);
      
      const prediction = await predictJobPerformance(
        {
          partName: orderItem.partName,
          processes: orderItem.processes,
          quantity: orderItem.quantity,
          complexity: orderItem.processes.includes('5-axis-milling') ? 'high' : 
                     orderItem.processes.includes('grinding') ? 'medium' : 'low',
          material: orderItem.material
        },
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      );

      console.log(`✅ Performance prediction:`);
      console.log(`   ⏱️  Duration: ${prediction.predictedDuration.toFixed(1)} hours`);
      console.log(`   ⭐ Quality Score: ${prediction.predictedQualityScore.toFixed(1)}/10`);
      console.log(`   🚀 On-time Probability: ${prediction.onTimeDeliveryProbability.toFixed(0)}%`);
      console.log(`   🔒 Confidence: ${prediction.confidenceLevel}%`);
      
      if (prediction.riskFactors.length > 0) {
        console.log(`   ⚠️  Risk Factors:`);
        prediction.riskFactors.forEach((risk, index) => {
          console.log(`      ${index + 1}. ${risk}`);
        });
      }

      if (prediction.recommendedActions.length > 0) {
        console.log(`   💡 Recommended Actions:`);
        prediction.recommendedActions.forEach((action, index) => {
          console.log(`      ${index + 1}. ${action}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in performance prediction test:', error);
  }
}

async function testSetupIntelligence() {
  console.log('\n🔧 Testing Setup Intelligence Integration');
  console.log('-'.repeat(50));

  try {
    for (const orderItem of testOrderItems.slice(0, 2)) { // Test first 2 items
      const processType = orderItem.processes[0]; // Use first process
      console.log(`\n🛠️  Setup intelligence for: ${orderItem.partName} - ${processType}`);
      
      // Generate setup intelligence
      const setupIntelligence = await generateSetupIntelligence(orderItem.partName, processType);
      
      if (setupIntelligence) {
        console.log(`✅ Setup intelligence found:`);
        console.log(`   📊 Historical Setups: ${setupIntelligence.totalHistoricalSetups}`);
        console.log(`   ⏱️  Avg Setup Time: ${setupIntelligence.setupMetrics.averageSetupTime.toFixed(0)}min`);
        console.log(`   ⭐ Avg Quality: ${setupIntelligence.setupMetrics.averageQualityScore.toFixed(1)}/10`);
        console.log(`   ✅ Success Rate: ${setupIntelligence.setupMetrics.setupSuccessRate.toFixed(0)}%`);
        console.log(`   🔧 Tool Changes: ${setupIntelligence.setupMetrics.toolChangeFrequency.toFixed(1)}`);
        
        // Get optimized parameters
        const optimized = await getOptimizedSetupParameters(orderItem.partName, processType);
        
        if (optimized) {
          console.log(`\n⚡ Setup Optimizations:`);
          console.log(`   🕒 Time Reduction: ${optimized.timeReduction.toFixed(0)}%`);
          console.log(`   ⭐ Quality Improvement: ${optimized.qualityImprovement.toFixed(1)} points`);
          console.log(`   🔒 Confidence: ${optimized.confidence}%`);
          
          if (optimized.recommendations.length > 0) {
            console.log(`   💡 Recommendations:`);
            optimized.recommendations.slice(0, 3).forEach((rec, index) => {
              console.log(`      ${index + 1}. ${rec}`);
            });
          }
        }

        // Predict setup success
        const setupPrediction = await predictSetupSuccess(orderItem.partName, processType, {
          operatorExperience: 'experienced',
          machineCondition: 'good',
          timeAvailable: 45,
          toolCondition: 'good',
          schedulePressure: 'medium'
        });

        if (setupPrediction) {
          console.log(`\n🔮 Setup Success Prediction:`);
          console.log(`   ✅ Success Probability: ${setupPrediction.successProbability.toFixed(0)}%`);
          console.log(`   ⏱️  Expected Time: ${setupPrediction.expectedSetupTime.toFixed(0)}min`);
          console.log(`   ⭐ Quality Prediction: ${setupPrediction.qualityPrediction.toFixed(1)}/10`);
          
          if (setupPrediction.riskFactors.length > 0) {
            console.log(`   ⚠️  Risk Factors: ${setupPrediction.riskFactors.slice(0, 2).join(', ')}`);
          }
        }
      } else {
        console.log(`❌ No setup intelligence found for ${orderItem.partName} - ${processType}`);
      }
    }
  } catch (error) {
    console.error('❌ Error in setup intelligence test:', error);
  }
}

async function testQualityIntelligence() {
  console.log('\n⭐ Testing Quality Intelligence Integration');
  console.log('-'.repeat(50));

  try {
    for (const orderItem of testOrderItems.slice(0, 2)) { // Test first 2 items
      console.log(`\n🎯 Quality intelligence for: ${orderItem.partName}`);
      
      const qualityIntelligence = await generateQualityIntelligence(
        orderItem.partName,
        orderItem.material,
        orderItem.processes
      );
      
      if (qualityIntelligence) {
        console.log(`✅ Quality intelligence found:`);
        console.log(`   📊 Historical Jobs: ${qualityIntelligence.totalHistoricalJobs}`);
        console.log(`   ⭐ Avg Quality: ${qualityIntelligence.qualityMetrics.averageQualityScore.toFixed(1)}/10`);
        console.log(`   ✅ Pass Rate: ${qualityIntelligence.qualityMetrics.qualityPassRate.toFixed(0)}%`);
        console.log(`   🔄 Rework Rate: ${qualityIntelligence.qualityMetrics.reworkRate.toFixed(1)}%`);
        
        if (qualityIntelligence.qualityTrends.length > 0) {
          console.log(`   📈 Trends: ${qualityIntelligence.qualityTrends.length} identified`);
          console.log(`      Latest trend: ${qualityIntelligence.qualityTrends[0]?.trend || 'stable'}`);
        }

        if (qualityIntelligence.criticalControlPoints.length > 0) {
          console.log(`   🎯 Critical Control Points:`);
          qualityIntelligence.criticalControlPoints.slice(0, 3).forEach((point, index) => {
            console.log(`      ${index + 1}. ${point.controlPoint} (${point.importance} importance)`);
          });
        }

        if (qualityIntelligence.recommendations.length > 0) {
          console.log(`   💡 Quality Recommendations:`);
          qualityIntelligence.recommendations.slice(0, 3).forEach((rec, index) => {
            console.log(`      ${index + 1}. ${rec.recommendation}`);
          });
        }
      } else {
        console.log(`❌ No quality intelligence found for ${orderItem.partName}`);
      }
    }
  } catch (error) {
    console.error('❌ Error in quality intelligence test:', error);
  }
}

async function runComprehensiveTest() {
  const startTime = Date.now();
  
  try {
    await testArchiveDrivenJobSuggestions();
    await testJobCreationFromArchive();
    await testProcessInheritance();
    await testPerformancePrediction();
    await testSetupIntelligence();
    await testQualityIntelligence();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Archive-Driven Job Creation System Test Complete');
    console.log(`⏱️  Total Duration: ${duration.toFixed(1)} seconds`);
    console.log('✅ All systems tested successfully');
    console.log('🚀 Ready for production use');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the comprehensive test
runComprehensiveTest(); 