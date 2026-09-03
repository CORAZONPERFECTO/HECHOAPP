export interface AdvisoryAlert {
    id: string;
    type: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY' | 'SUCCESS';
    category: 'OPERATIONS' | 'FINANCE' | 'TALENT' | 'PROCUREMENT';
    title: string;
    description: string;
    financialImpact?: number;
    suggestedAction: string;
    link?: string;
}

export interface TechnicianPerformance {
    userId: string;
    name: string;
    role: string;
    ticketsResolved: number;
    ticketsActive: number;
    warrantyReworkCount: number;
    totalRevenueGenerated: number;
    totalProfitGenerated: number;
    averageProfitMargin: number;
    photoComplianceRate: number; // 0 to 100%
    averageResolutionHours: number;
    overallScore: number; // 0 to 100
    suggestedBonus: number;
}

export interface AdvisoryMetrics {
    overallHealthScore: number; // 0 to 100
    totalEstimatedLeaks: number; // RD$ lost to inefficiencies/overpricing/no-ncf

    // 1. Operations
    operations: {
        totalTickets: number;
        completedTickets: number;
        openTickets: number;
        stuckTicketsCount: number; // >24h without update
        avgCycleHours: number;
        warrantyReworkCount: number;
        warrantyReworkRate: number; // %
        photoComplianceRate: number; // %
        totalKmAssigned: number;
        avgKmPerTicket: number;
        score: number;
    };

    // 2. Finance & Procurement
    finance: {
        totalRevenue: number;
        totalCosts: number;
        totalProfit: number;
        profitMargin: number; // %
        streetPurchasesTotal: number;
        warehouseMaterialsTotal: number;
        informalPurchasesTotal: number; // no NCF
        informalPurchasesTaxLoss: number; // 18% ITBIS lost
        overpricedPurchasesCount: number;
        overpricedEstimatedLoss: number;
        lowMarginTicketsCount: number; // < 20%
        negativeMarginTicketsCount: number; // < 0%
        score: number;
    };

    // 3. Talent & Culture
    talent: {
        totalTechnicians: number;
        topPerformerName: string;
        technicians: TechnicianPerformance[];
        avgTechnicianScore: number;
        totalSuggestedBonuses: number;
        score: number;
    };

    // Alerts
    alerts: AdvisoryAlert[];
}

export interface AIAdvisoryAuditResult {
    executiveSummary: string;
    operationalDiagnosis: {
        bottlenecks: string[];
        recommendations: string[];
    };
    financialDiagnosis: {
        leakSources: string[];
        pricingAndProcurementPlan: string[];
    };
    talentDiagnosis: {
        incentiveRecommendations: string[];
        trainingNeeds: string[];
    };
    actionPlan: Array<{
        priority: 'ALTA' | 'MEDIA' | 'BAJA';
        title: string;
        responsible: string;
        expectedImpact: string;
    }>;
}
