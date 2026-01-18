/**
 * View configuration validation
 * Validates table, chart, and cards view configurations
 */

import type { 
  ViewDefinition, 
  FieldDefinition, 
  ValidationResult,
  ChartConfig,
  TableConfig,
  CardsConfig 
} from './types';

// Valid view types
const VALID_VIEW_TYPES = ['table', 'chart', 'cards'] as const;

// Valid chart types
const VALID_CHART_TYPES = ['bar', 'line', 'pie', 'area'] as const;

// Valid aggregation types
const VALID_AGGREGATIONS = ['sum', 'average', 'count'] as const;

export class ViewValidator {
  /**
   * Validate a single view definition
   */
  validateView(
    view: ViewDefinition, 
    fields: FieldDefinition[],
    index?: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const viewRef = index !== undefined ? `View #${index + 1}` : `View "${view.title}"`;

    // Required properties
    if (!view.type) {
      errors.push(`${viewRef}: View type is required`);
    } else if (!VALID_VIEW_TYPES.includes(view.type as typeof VALID_VIEW_TYPES[number])) {
      errors.push(
        `${viewRef}: Invalid view type "${view.type}". ` +
        `Valid types: ${VALID_VIEW_TYPES.join(', ')}`
      );
    }

    if (!view.title || view.title.trim().length === 0) {
      warnings.push(`${viewRef}: View title is missing`);
    } else if (view.title.length > 100) {
      errors.push(`${viewRef}: View title must be 100 characters or less`);
    }

    if (!view.config) {
      errors.push(`${viewRef}: View configuration is required`);
      return { valid: false, errors, warnings };
    }

    // Type-specific validation
    switch (view.type) {
      case 'table':
        this.validateTableConfig(view.config as TableConfig, fields, viewRef, errors, warnings);
        break;
      case 'chart':
        this.validateChartConfig(view.config as ChartConfig, fields, viewRef, errors, warnings);
        break;
      case 'cards':
        this.validateCardsConfig(view.config as CardsConfig, fields, viewRef, errors, warnings);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate table configuration
   */
  private validateTableConfig(
    config: TableConfig,
    fields: FieldDefinition[],
    viewRef: string,
    errors: string[],
    warnings: string[]
  ): void {
    const fieldNames = fields.map(f => f.name);

    // Validate columns
    if (config.columns && Array.isArray(config.columns)) {
      for (const column of config.columns) {
        if (!fieldNames.includes(column)) {
          warnings.push(`${viewRef}: Column "${column}" references unknown field`);
        }
      }

      // Check for duplicate columns
      const uniqueColumns = new Set(config.columns);
      if (uniqueColumns.size !== config.columns.length) {
        warnings.push(`${viewRef}: Table has duplicate columns`);
      }
    }

    // Validate sortBy
    if (config.sortBy) {
      if (!fieldNames.includes(config.sortBy)) {
        warnings.push(`${viewRef}: Sort field "${config.sortBy}" references unknown field`);
      }
    }

    // Validate sortOrder
    if (config.sortOrder && !['asc', 'desc'].includes(config.sortOrder)) {
      errors.push(`${viewRef}: Invalid sort order "${config.sortOrder}". Use "asc" or "desc".`);
    }

    // Validate pageSize
    if (config.pageSize !== undefined) {
      if (config.pageSize < 1) {
        errors.push(`${viewRef}: Page size must be at least 1`);
      } else if (config.pageSize > 1000) {
        warnings.push(`${viewRef}: Large page size (${config.pageSize}) may impact performance`);
      }
    }
  }

  /**
   * Validate chart configuration
   */
  private validateChartConfig(
    config: ChartConfig,
    fields: FieldDefinition[],
    viewRef: string,
    errors: string[],
    warnings: string[]
  ): void {
    const fieldNames = fields.map(f => f.name);
    const numericFields = fields.filter(f => f.type === 'number').map(f => f.name);

    // Validate chart type
    if (!config.chartType) {
      errors.push(`${viewRef}: Chart type is required`);
    } else if (!VALID_CHART_TYPES.includes(config.chartType as typeof VALID_CHART_TYPES[number])) {
      errors.push(
        `${viewRef}: Invalid chart type "${config.chartType}". ` +
        `Valid types: ${VALID_CHART_TYPES.join(', ')}`
      );
    }

    // Validate yAxis (required for most charts)
    if (!config.yAxis) {
      errors.push(`${viewRef}: Chart Y-axis field is required`);
    } else {
      if (!fieldNames.includes(config.yAxis)) {
        errors.push(`${viewRef}: Y-axis field "${config.yAxis}" does not exist`);
      } else if (!numericFields.includes(config.yAxis)) {
        // yAxis should typically be numeric
        const field = fields.find(f => f.name === config.yAxis);
        if (field && field.type !== 'number') {
          // For count aggregation, any field works
          if (config.aggregation !== 'count') {
            warnings.push(
              `${viewRef}: Y-axis field "${config.yAxis}" is not numeric. ` +
              `Chart may not display correctly unless using count aggregation.`
            );
          }
        }
      }
    }

    // Validate xAxis (optional but recommended)
    if (config.xAxis) {
      if (!fieldNames.includes(config.xAxis)) {
        errors.push(`${viewRef}: X-axis field "${config.xAxis}" does not exist`);
      }
    } else {
      // For bar and line charts, xAxis is usually needed
      if (config.chartType === 'bar' || config.chartType === 'line') {
        warnings.push(`${viewRef}: No X-axis specified for ${config.chartType} chart. Will use record index.`);
      }
    }

    // Validate groupBy
    if (config.groupBy) {
      if (!fieldNames.includes(config.groupBy)) {
        warnings.push(`${viewRef}: Group-by field "${config.groupBy}" does not exist`);
      }
    }

    // Validate aggregation
    if (config.aggregation) {
      if (!VALID_AGGREGATIONS.includes(config.aggregation as typeof VALID_AGGREGATIONS[number])) {
        errors.push(
          `${viewRef}: Invalid aggregation "${config.aggregation}". ` +
          `Valid types: ${VALID_AGGREGATIONS.join(', ')}`
        );
      }

      // Sum and average require numeric fields
      if ((config.aggregation === 'sum' || config.aggregation === 'average') && 
          config.yAxis && !numericFields.includes(config.yAxis)) {
        errors.push(
          `${viewRef}: ${config.aggregation} aggregation requires a numeric Y-axis field`
        );
      }
    }

    // Pie chart specific validation
    if (config.chartType === 'pie') {
      if (!config.groupBy && !config.xAxis) {
        warnings.push(`${viewRef}: Pie chart usually needs a groupBy or xAxis field for categories`);
      }
      if (config.xAxis && config.xAxis === config.yAxis) {
        warnings.push(`${viewRef}: Pie chart X-axis and Y-axis should typically be different fields`);
      }
    }
  }

  /**
   * Validate cards configuration
   */
  private validateCardsConfig(
    config: CardsConfig,
    fields: FieldDefinition[],
    viewRef: string,
    errors: string[],
    warnings: string[]
  ): void {
    const fieldNames = fields.map(f => f.name);

    // Validate titleField (required)
    if (!config.titleField) {
      errors.push(`${viewRef}: Cards view requires a title field`);
    } else if (!fieldNames.includes(config.titleField)) {
      errors.push(`${viewRef}: Title field "${config.titleField}" does not exist`);
    }

    // Validate subtitleField (optional)
    if (config.subtitleField) {
      if (!fieldNames.includes(config.subtitleField)) {
        warnings.push(`${viewRef}: Subtitle field "${config.subtitleField}" does not exist`);
      }
      if (config.subtitleField === config.titleField) {
        warnings.push(`${viewRef}: Subtitle field is same as title field`);
      }
    }

    // Validate layout
    if (config.layout && !['grid', 'list'].includes(config.layout)) {
      errors.push(`${viewRef}: Invalid layout "${config.layout}". Use "grid" or "list".`);
    }
  }

  /**
   * Validate multiple views together
   */
  validateViewSet(views: ViewDefinition[], fields: FieldDefinition[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty views
    if (!views || views.length === 0) {
      warnings.push('No views defined. At least one view is recommended.');
      return { valid: true, errors, warnings };
    }

    // Validate each view
    for (let i = 0; i < views.length; i++) {
      const result = this.validateView(views[i], fields, i);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Check for duplicate titles
    const titles = views.map(v => v.title?.toLowerCase()).filter(Boolean);
    const dupTitles = titles.filter((t, i) => titles.indexOf(t) !== i);
    if (dupTitles.length > 0) {
      warnings.push(`Duplicate view titles: ${Array.from(new Set(dupTitles)).join(', ')}`);
    }

    // Recommend at least one table view
    if (!views.some(v => v.type === 'table')) {
      warnings.push('Consider adding a table view to see all data');
    }

    // Check view count
    if (views.length > 10) {
      warnings.push(`Many views defined (${views.length}). Consider consolidating.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Export singleton instance
export const viewValidator = new ViewValidator();
