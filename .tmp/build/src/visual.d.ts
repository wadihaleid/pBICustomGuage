import "core-js/stable";
import "../style/visual.less";
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import * as d3 from "d3";
import ISelectionId = powerbi.visuals.ISelectionId;
import { TooltipEventArgs, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
export interface SingleGuageChartUpdateOptions {
}
export interface GaugeChartLayout {
    rows: number;
    columns: number;
    area: number;
}
export interface SingleGaugeChartDataViewModel {
    category: string;
    value: number;
    target1: number;
    target2: number;
    numberFormatter(d: any): string;
    percentageFormatter(d: any): string;
    target1Gap: number;
    target2Gap: number;
    targetGapThreshold: number;
    valueDisplayName: string;
    target1DisplayName: string;
    target2DisplayName: string;
    tooltip: {
        valueLabel: string;
        target1Label: string;
        target2Label: string;
    };
    color(d: any, t1: any, t2: any): string;
    selectionId: ISelectionId;
}
export interface SingleGaugeChartInitOptions {
    element: d3.Selection<Element, undefined, null, unknown>;
}
export interface GaugeChartArrayDataViewModel {
    categories: SingleGaugeChartDataViewModel[];
}
export interface SingleGaugeChartConfig {
    element: d3.Selection<Element, undefined, null, unknown>;
    x: number;
    y: number;
    minValue: number;
    maxValue: number;
    size: number;
    clipWidth: number;
    clipHeight: number;
    ringInset: number;
    enableInteraction: boolean;
    ringWidth: number;
    minAngle: number;
    gaugeHeight: number;
    gaugeWidth: number;
    maxAngle: number;
    transitionMs: number;
    majorTicks: number;
    labelFormat: any;
    labelInset: number;
    numberFormat: any;
    pecentageFormat: any;
}
export interface VisualMetaData {
}
export interface SingleColumnMetaData {
    format: string;
    displayName: string;
    queryName: string;
}
export declare class TooltipServiceWrapper implements ITooltipServiceWrapper {
    private handleTouchTimeoutId;
    private visualHostTooltipService;
    private rootElement;
    private handleTouchDelay;
    constructor(tooltipService: ITooltipService, rootElement: Element, handleTouchDelay: number);
    private makeTooltipEventArgs;
    private getCoordinates;
    private canDisplayTooltip;
    addTooltip<T>(selection: any, getTooltipInfoDelegate: (args: TooltipEventArgs<T>) => VisualTooltipDataItem[], getDataPointIdentity: (args: TooltipEventArgs<T>) => ISelectionId, reloadTooltipDataOnMouseMove?: boolean): void;
    hide(): void;
}
export declare class CustomGauge implements IVisual {
    private singleGaugeChartArray;
    private count;
    private root;
    private dataView;
    private host;
    private selectionManager;
    private chartLayout;
    private allowInteraction;
    private visualSettings;
    constructor(options: VisualConstructorOptions);
    enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration;
    update(options: VisualUpdateOptions): void;
    private Convert;
    private createChartArrayDataViewModel;
    private static getGaugeSize;
}
export declare class SingleGaugeChart implements IVisual {
    private root;
    private config;
    private scale;
    private r;
    private tickData;
    private arc;
    private currentValueLbl;
    private target1ValueLbl;
    private categoryLbl;
    private textVerticalSPacing;
    private dataViewModel;
    private foregroundArc;
    private selectionManager;
    private tooltipServiceWrapper;
    private host;
    private targetsCount;
    private catLblVertical;
    constructor(_dataViewModel: SingleGaugeChartDataViewModel, _selectionManager: ISelectionManager, _host: IVisualHost);
    private createTooltipServiceWrapper;
    private configure;
    private setDataViewModel;
    private setSelectionManager;
    private setHost;
    private deg2rad;
    private getFillColor;
    private getTicks;
    /** Function to return values rounded to closest ten power.

     */
    private scaleAndRoundValue;
    private wrap;
    init(_element: any, _x: any, _y: any, _size: any, _height: any, _width: any, _clipHeight: any, _clipWidth: any, _enableInteraction: any): void;
    private centerTranslation;
    update(_element: any, _x: any, _y: any, _size: any, _height: any, _width: any, _clipHeight: any, _clipWidth: any, _enableInteraction: any): void;
    private getTooltipData;
    private enableInteraction;
    remove(): void;
}
export declare function logExceptions(): MethodDecorator;
