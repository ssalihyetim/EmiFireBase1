import { Machine, ProcessInstance } from "@/types/planning";

export interface MachineScore {
  machine: Machine;
  totalScore: number;
  breakdown: {
    capabilityScore: number;
    loadBalanceScore: number;
    setupOptimizationScore: number;
    efficiencyScore: number;
  };
  matchReason: string;
}

export interface MatchingWeights {
  capability: number;        // 0.4 - Must have required capabilities
  loadBalance: number;       // 0.3 - Distribute work evenly
  setupOptimization: number; // 0.2 - Minimize setup time
  efficiency: number;        // 0.1 - Consider machine efficiency
}

export class MachineMatcher {
  private readonly defaultWeights: MatchingWeights = {
    capability: 0.4,
    loadBalance: 0.3,
    setupOptimization: 0.2,
    efficiency: 0.1
  };

  private weights: MatchingWeights;

  constructor(weights?: MatchingWeights) {
    this.weights = weights || this.defaultWeights;
  }

  /**
   * Find and score all capable machines for a process instance
   */
  async findCapableMachines(
    processInstance: ProcessInstance,
    allMachines: Machine[],
    currentWorkloads: Map<string, number> = new Map()
  ): Promise<MachineScore[]> {
    // First filter by basic capability requirements
    const capableMachines = this.filterByCapabilities(processInstance, allMachines);
    
    if (capableMachines.length === 0) {
      console.warn(`⚠️ No machines found for ${processInstance.machineType} with capabilities: ${processInstance.requiredMachineCapabilities?.join(', ') || 'none'}`);
      return [];
    }

    // Score each capable machine
    const scoredMachines: MachineScore[] = [];
    
    for (const machine of capableMachines) {
      const score = this.scoreMachine(processInstance, machine, allMachines, currentWorkloads);
      scoredMachines.push(score);
    }

    // Sort by total score (highest first)
    return scoredMachines.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Filter machines by basic capability requirements
   */
  private filterByCapabilities(processInstance: ProcessInstance, machines: Machine[]): Machine[] {
    return machines.filter(machine => {
      // Must be active
      if (!machine.isActive) {
        return false;
      }

      // Must match machine type
      if (machine.type !== processInstance.machineType) {
        return false;
      }

      // Check required capabilities
      if (processInstance.requiredMachineCapabilities && processInstance.requiredMachineCapabilities.length > 0) {
        const hasRequiredCapabilities = processInstance.requiredMachineCapabilities.every(
          requiredCap => machine.capabilities?.includes(requiredCap)
        );
        
        if (!hasRequiredCapabilities) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Score a machine for a specific process instance
   */
  private scoreMachine(
    processInstance: ProcessInstance,
    machine: Machine,
    allMachines: Machine[],
    currentWorkloads: Map<string, number>
  ): MachineScore {
    const capabilityScore = this.calculateCapabilityScore(processInstance, machine);
    const loadBalanceScore = this.calculateLoadBalanceScore(machine, allMachines, currentWorkloads);
    const setupOptimizationScore = this.calculateSetupOptimizationScore(processInstance, machine);
    const efficiencyScore = this.calculateEfficiencyScore(machine);

    const totalScore = 
      (capabilityScore * this.weights.capability) +
      (loadBalanceScore * this.weights.loadBalance) +
      (setupOptimizationScore * this.weights.setupOptimization) +
      (efficiencyScore * this.weights.efficiency);

    const matchReason = this.generateMatchReason(machine, capabilityScore, loadBalanceScore);

    return {
      machine,
      totalScore,
      breakdown: {
        capabilityScore,
        loadBalanceScore,
        setupOptimizationScore,
        efficiencyScore
      },
      matchReason
    };
  }

  /**
   * Calculate capability match score (0-100)
   */
  private calculateCapabilityScore(processInstance: ProcessInstance, machine: Machine): number {
    let score = 100; // Start with perfect score

    // Penalty for missing required capabilities (should be 0 after filtering)
    const requiredCaps = processInstance.requiredMachineCapabilities || [];
    const machineCaps = machine.capabilities || [];
    
    const missingCaps = requiredCaps.filter(cap => !machineCaps.includes(cap));
    score -= missingCaps.length * 50; // Heavy penalty for missing capabilities

    // Bonus for additional relevant capabilities
    const bonusCapabilities = [
      'high_precision',
      'high_speed', 
      'complex_geometry',
      'live_tooling',
      'titanium_cutting',
      'aluminum_cutting'
    ];

    const bonusCaps = machineCaps.filter(cap => bonusCapabilities.includes(cap));
    score += bonusCaps.length * 5; // Small bonus for extra capabilities

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate load balance score (0-100)
   * Higher score for machines with lower current workload
   */
  private calculateLoadBalanceScore(
    machine: Machine,
    allMachines: Machine[],
    currentWorkloads: Map<string, number>
  ): number {
    const currentWorkload = currentWorkloads.get(machine.id) || machine.currentWorkload || 0;
    
    // Find the machine with highest workload for normalization
    const maxWorkload = Math.max(
      ...allMachines.map(m => currentWorkloads.get(m.id) || m.currentWorkload || 0)
    );

    if (maxWorkload === 0) {
      return 100; // All machines equally available
    }

    // Score inversely proportional to workload
    const utilizationPercentage = (currentWorkload / maxWorkload) * 100;
    return Math.max(0, 100 - utilizationPercentage);
  }

  /**
   * Calculate setup optimization score (0-100)
   * Higher score for machines that minimize setup time
   */
  private calculateSetupOptimizationScore(processInstance: ProcessInstance, machine: Machine): number {
    let score = 50; // Base score

    // Consider machine-specific factors that affect setup time
    const machineCaps = machine.capabilities || [];

    // Machines with live tooling reduce setup time for turning operations
    if (processInstance.machineType === 'turning' && machineCaps.includes('live_tooling')) {
      score += 20;
    }

    // High-precision machines may require more setup time
    if (machineCaps.includes('high_precision')) {
      score -= 10; // Slightly longer setup for precision work
    }

    // 5-axis machines generally have longer setup times
    if (machine.type === '5-axis') {
      score -= 15;
    }

    // High-speed machines can offset setup time with faster execution
    if (machineCaps.includes('high_speed')) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate efficiency score based on machine characteristics (0-100)
   */
  private calculateEfficiencyScore(machine: Machine): number {
    let score = 50; // Base efficiency

    const machineCaps = machine.capabilities || [];

    // High-speed capability adds efficiency
    if (machineCaps.includes('high_speed')) {
      score += 25;
    }

    // High precision might reduce speed but adds quality
    if (machineCaps.includes('high_precision')) {
      score += 15;
    }

    // Complex geometry capability indicates advanced machine
    if (machineCaps.includes('complex_geometry')) {
      score += 10;
    }

    // Consider hourly rate as efficiency factor (lower cost = higher efficiency score)
    if (machine.hourlyRate) {
      if (machine.hourlyRate < 60) {
        score += 15; // Low cost machine
      } else if (machine.hourlyRate > 100) {
        score -= 10; // High cost machine (but may be justified by capability)
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate human-readable match reason
   */
  private generateMatchReason(
    machine: Machine,
    capabilityScore: number,
    loadBalanceScore: number
  ): string {
    const reasons: string[] = [];

    if (capabilityScore >= 90) {
      reasons.push("Perfect capability match");
    } else if (capabilityScore >= 70) {
      reasons.push("Good capability match");
    }

    if (loadBalanceScore >= 80) {
      reasons.push("Low workload");
    } else if (loadBalanceScore >= 60) {
      reasons.push("Moderate workload");
    } else {
      reasons.push("High workload");
    }

    const caps = machine.capabilities || [];
    if (caps.includes('high_speed')) {
      reasons.push("High speed capability");
    }
    if (caps.includes('high_precision')) {
      reasons.push("High precision capability");
    }

    return reasons.join(', ') || "Basic match";
  }

  /**
   * Get the best machine for a process instance
   */
  async getBestMachine(
    processInstance: ProcessInstance,
    allMachines: Machine[],
    currentWorkloads: Map<string, number> = new Map()
  ): Promise<MachineScore | null> {
    const scoredMachines = await this.findCapableMachines(processInstance, allMachines, currentWorkloads);
    return scoredMachines.length > 0 ? scoredMachines[0] : null;
  }

  /**
   * Get capability analysis for debugging
   */
  getCapabilityAnalysis(processInstance: ProcessInstance, machines: Machine[]): {
    requiredCapabilities: string[];
    availableMachines: Array<{
      machineName: string;
      machineType: string;
      capabilities: string[];
      hasAllRequired: boolean;
      missingCapabilities: string[];
    }>;
  } {
    const requiredCapabilities = processInstance.requiredMachineCapabilities || [];
    
    const availableMachines = machines
      .filter(m => m.type === processInstance.machineType)
      .map(machine => {
        const machineCaps = machine.capabilities || [];
        const missingCapabilities = requiredCapabilities.filter(cap => !machineCaps.includes(cap));
        
        return {
          machineName: machine.name,
          machineType: machine.type,
          capabilities: machineCaps,
          hasAllRequired: missingCapabilities.length === 0,
          missingCapabilities
        };
      });

    return {
      requiredCapabilities,
      availableMachines
    };
  }

  /**
   * Update matching weights
   */
  updateWeights(newWeights: Partial<MatchingWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
    
    // Ensure weights sum to 1.0
    const totalWeight = Object.values(this.weights).reduce((sum: number, weight: number) => sum + weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      console.warn(`Machine matching weights sum to ${totalWeight}, not 1.0. Consider normalizing.`);
    }
  }
} 