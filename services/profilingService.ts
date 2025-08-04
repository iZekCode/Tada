import type { DataRecord, ColumnProfile, DataQualityIssue, DataProfile } from '../types';

// Helper to check if a value is a valid, finite number
const isFiniteNumber = (val: any): val is number => typeof val === 'number' && !isNaN(val) && isFinite(val);

/**
 * A more robust function to parse a potential number from various string formats.
 * Handles currency symbols, commas, and accounting parentheses.
 */
const parseIfNumber = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return isFiniteNumber(val) ? val : null;
    if (typeof val !== 'string') return null;

    let str = String(val).trim();
    
    const isParenthesized = str.startsWith('(') && str.endsWith(')');
    if (isParenthesized) {
        str = '-' + str.substring(1, str.length - 1);
    }
    
    // Remove currency symbols and thousands separators
    str = str.replace(/[$,]/g, '');
    
    const num = parseFloat(str);
    
    return isFiniteNumber(num) ? num : null;
};

// Stats calculation for a numeric column
const calculateNumericStats = (values: number[]) => {
    if (values.length === 0) {
        return { min: 0, max: 0, mean: 0, median: 0, std: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    return { 
        min: parseFloat(min.toFixed(2)), 
        max: parseFloat(max.toFixed(2)), 
        mean: parseFloat(mean.toFixed(2)), 
        median: parseFloat(median.toFixed(2)), 
        std: parseFloat(std.toFixed(2)) 
    };
};

// Histogram generation for a numeric column
const generateHistogram = (values: number[], bins = 10) => {
    if (values.length < 2) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (min === max) return [{ name: `${min}`, value: values.length }];

    const binSize = (max - min) / bins;
    const histogram = Array.from({ length: bins }, (_, i) => {
        const binStart = min + i * binSize;
        const binEnd = binStart + binSize;
        return {
            name: `${binStart.toLocaleString(undefined, {maximumFractionDigits: 1})}-${binEnd.toLocaleString(undefined, {maximumFractionDigits: 1})}`,
            value: 0
        };
    });

    for (const value of values) {
        let binIndex = Math.floor((value - min) / binSize);
        if (binIndex === bins) {
            binIndex--;
        }
        if (histogram[binIndex]) {
            histogram[binIndex].value++;
        }
    }
    
    return histogram;
};

// Stats for categorical column
const calculateCategoricalStats = (values: (string | null | undefined)[]) => {
    const valueCounts: Record<string, number> = {};
    for (const val of values) {
        const key = val === null || val === undefined ? 'NULL' : String(val);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
    }
    
    const uniqueCount = Object.keys(valueCounts).length;
    const topValues = Object.entries(valueCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
    
    const mode = topValues.length > 0 && topValues[0].name !== 'NULL' ? topValues[0].name : null;

    return { uniqueCount, topValues, mode };
};

export const profileData = (
    data: DataRecord[],
    columnClassifications: Record<string, 'numeric' | 'categorical'>
): DataProfile | null => {
    if (!data || data.length === 0) return null;
    
    const columns = Object.keys(data[0]);
    const rowCount = data.length;
    const dataQualityIssues: DataQualityIssue[] = [];

    // Step 1: Initialize stats collectors for each column
    const collectors = columns.reduce((acc, col) => {
        if (columnClassifications[col]) { // Only profile classified columns
            acc[col] = {
                values: [],
                missingCount: 0,
            };
        }
        return acc;
    }, {} as Record<string, { values: any[], missingCount: number }>);

    // Step 2: Single pass over the data to collect values
    for (const row of data) {
        for (const col of columns) {
            if (collectors[col]) {
                const value = row[col];
                if (value === null || value === undefined || value === '') {
                    collectors[col].missingCount++;
                } else {
                    collectors[col].values.push(value);
                }
            }
        }
    }
    
    const columnProfiles: ColumnProfile[] = [];

    // Step 3: Process collected data for each column
    for (const col of columns) {
        if (!collectors[col]) {
            console.warn(`No classification provided for column "${col}". Skipping profile.`);
            continue;
        }

        const { values: validValues, missingCount } = collectors[col];
        const missingPercentage = (missingCount / rowCount) * 100;
        
        const columnType = columnClassifications[col];

        let profile: Partial<ColumnProfile> & { column: string, type: 'numeric' | 'categorical' } = {
            column: col,
            type: columnType,
            missingPercentage: parseFloat(missingPercentage.toFixed(1)),
        };

        if (validValues.length === 0) {
            profile.type = 'categorical'; // Override for empty columns
            profile.stats = { uniqueCount: 0, topValues: [], mode: null };
            if (missingPercentage === 100) {
                dataQualityIssues.push({ issue: 'Empty Column', column: col, details: '100% of values are missing.' });
            }
            columnProfiles.push(profile as ColumnProfile);
            continue;
        }

        if (profile.type === 'numeric') {
            const numericValues = validValues.map(parseIfNumber).filter((v): v is number => v !== null);
            const unparsableCount = validValues.length - numericValues.length;

            if (numericValues.length === 0 && validValues.length > 0) {
                profile.type = 'categorical';
                profile.stats = calculateCategoricalStats(validValues.map(String));
                dataQualityIssues.push({
                    issue: 'Type Mismatch',
                    column: col,
                    details: 'Column classified as numeric, but no parsable numbers were found.'
                });
            } else {
                profile.stats = calculateNumericStats(numericValues);
                profile.histogramData = generateHistogram(numericValues);
                
                if (unparsableCount > 0) {
                    const unparsablePercentage = (unparsableCount / validValues.length * 100).toFixed(1);
                    dataQualityIssues.push({
                        issue: 'Unparsable Values',
                        column: col,
                        details: `${unparsableCount} values (${unparsablePercentage}% of non-empty) could not be parsed as numbers.`
                    });
                }
            }
        } else { // 'categorical'
            profile.stats = calculateCategoricalStats(validValues.map(String));
        }

        columnProfiles.push(profile as ColumnProfile);
        
        if (missingPercentage > 0 && missingPercentage < 100) {
            dataQualityIssues.push({
                issue: 'Missing Values',
                column: col,
                details: `${profile.missingPercentage}% of values are missing.`
            });
        }
    }
    
    return {
        columnProfiles,
        dataQualityIssues,
        rowCount,
        columnCount: columns.length,
    };
};