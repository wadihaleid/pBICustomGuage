
"use strict";

import "core-js/stable";
import "../style/visual.less";
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.IVisual;
import IViewport = powerbi.IViewport;
import DataView = powerbi.DataView;
import IColorPalette = powerbi.extensibility.IColorPalette;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import * as d3 from "d3";
import DataViewCategorical = powerbi.DataViewCategorical;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import PrimitiveValue = powerbi.PrimitiveValue;
import DataViewValueColumn = powerbi.DataViewValueColumn;
import { VisualSettings } from "./settings";
import { createTooltipServiceWrapper, TooltipEventArgs, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
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
    numberFormatter(d): string;
    percentageFormatter(d): string;
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
    color(d, t1, t2): string;
    selectionId: ISelectionId;
}

export interface SingleGaugeChartInitOptions {
    element: d3.Selection<Element, undefined, null, unknown>;
}

export interface GaugeChartArrayDataViewModel {
    // Array of single charts
    categories: SingleGaugeChartDataViewModel[];
}

export interface SingleGaugeChartConfig {
    element: d3.Selection<Element, undefined, null, unknown>;
    x: number,
    y: number,
    minValue: number;
    maxValue: number;
    size: number;
    clipWidth: number;
    clipHeight: number;
    ringInset: number;
    enableInteraction: boolean,
    ringWidth: number;
    minAngle: number;
    gaugeHeight: number,
    gaugeWidth: number,
    maxAngle: number;
    transitionMs: number;
    majorTicks: number;
    labelFormat: any;
    labelInset: number;
    numberFormat: any;
    pecentageFormat: any;
    smallChart: boolean;
    bigChart: boolean;
}

export interface VisualMetaData {

}

export interface SingleColumnMetaData {
    format: string;
    displayName: string;
    queryName: string;
}

export class TooltipServiceWrapper implements ITooltipServiceWrapper {
    private handleTouchTimeoutId: number;
    private visualHostTooltipService: ITooltipService;
    private rootElement: Element;
    private handleTouchDelay: number;

    constructor(tooltipService: ITooltipService, rootElement: Element, handleTouchDelay: number) {
        this.visualHostTooltipService = tooltipService;
        this.handleTouchDelay = handleTouchDelay;
        this.rootElement = rootElement;
    }

    private makeTooltipEventArgs<T>(rootNode: any, isPointerEvent: boolean, isTouchEvent: boolean): TooltipEventArgs<T> {
        let target = <HTMLElement>(<Event>d3.event).target;
        let data: any = d3.select(target).datum();

        let mouseCoordinates = this.getCoordinates(rootNode, isPointerEvent);
        let elementCoordinates: number[] = this.getCoordinates(target, isPointerEvent);

        return {
            data: data,
            coordinates: mouseCoordinates,
            elementCoordinates: elementCoordinates,
            context: target,
            isTouchEvent: isTouchEvent
        };
    }


    private getCoordinates(rootNode: any, isPointerEvent: boolean): number[] {
        let coordinates: number[];

        if (isPointerEvent) {
            let e = <any>d3.event, s;
            while (s = e.sourceEvent) e = s;

            //let rect = rootNode.getBoundingClientRect();
            coordinates = [e.clientX, e.clientY];
        }
        else {
            let touchCoordinates = d3.touches(rootNode);
            if (touchCoordinates && touchCoordinates.length > 0) {
                coordinates = touchCoordinates[0];
            }
        }
        return coordinates;
    }

    private canDisplayTooltip(d3Event: any): boolean {
        let canDisplay: boolean = true;
        let mouseEvent: MouseEvent = <MouseEvent>d3Event;
        if (mouseEvent.buttons !== undefined) {
            // Check mouse buttons state
            let hasMouseButtonPressed = mouseEvent.buttons !== 0;
            canDisplay = !hasMouseButtonPressed;
        }

        // Make sure we are not ignoring mouse events immediately after touch end.
        canDisplay = canDisplay && (this.handleTouchTimeoutId == null);

        return canDisplay;
    }


    public addTooltip<T>(
        selection: any,
        getTooltipInfoDelegate: (args: TooltipEventArgs<T>) => VisualTooltipDataItem[],
        getDataPointIdentity: (args: TooltipEventArgs<T>) => ISelectionId,
        reloadTooltipDataOnMouseMove?: boolean): void {

        if (!selection || !this.visualHostTooltipService.enabled()) {
            return;
        }

        let rootNode = this.rootElement;

        // Mouse events
        selection.on("mouseover.tooltip", () => {
            // Ignore mouseover while handling touch events
            if (!this.canDisplayTooltip(d3.event))
                return;

            let tooltipEventArgs = this.makeTooltipEventArgs<T>(rootNode, true, false);
            if (!tooltipEventArgs)
                return;

            let tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
            if (tooltipInfo == null)
                return;

            let selectionId = getDataPointIdentity(tooltipEventArgs);

            this.visualHostTooltipService.show({
                coordinates: tooltipEventArgs.coordinates,
                isTouchEvent: false,
                dataItems: tooltipInfo,
                identities: selectionId ? [selectionId] : [],
            });
        });

        selection.on("mouseout.tooltip", () => {
            this.visualHostTooltipService.hide({
                isTouchEvent: false,
                immediately: false,
            });
        });

        selection.on("mousemove.tooltip", () => {
            // Ignore mousemove while handling touch events
            if (!this.canDisplayTooltip(d3.event))
                return;

            let tooltipEventArgs = this.makeTooltipEventArgs<T>(rootNode, true, false);
            if (!tooltipEventArgs)
                return;

            let tooltipInfo: VisualTooltipDataItem[];
            if (reloadTooltipDataOnMouseMove) {
                tooltipInfo = getTooltipInfoDelegate(tooltipEventArgs);
                if (tooltipInfo == null)
                    return;
            }

            let selectionId = getDataPointIdentity(tooltipEventArgs);

            this.visualHostTooltipService.move({
                coordinates: tooltipEventArgs.coordinates,
                isTouchEvent: false,
                dataItems: tooltipInfo,
                identities: selectionId ? [selectionId] : [],
            });
        });
    }

    public hide(): void {

    }
}

export class CustomGauge implements IVisual {

    private singleGaugeChartArray: SingleGaugeChart[];
    private count: number;
    private root: d3.Selection<Element, undefined, null, unknown>;
    private dataView: DataView;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private chartLayout: number;
    private allowInteraction: boolean;
    private visualSettings: VisualSettings;
    private smallChart: boolean;
    private bigChart: boolean;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();
        this.root = d3.select(options.element);
        this.allowInteraction = options.host.allowInteractions;
        options.element.style.overflow = 'auto';
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        const settings: VisualSettings = this.visualSettings || <VisualSettings>VisualSettings.getDefault();
        return VisualSettings.enumerateObjectInstances(settings, options);
    }

    @logExceptions()
    public update(options: VisualUpdateOptions) {

        if (!options.dataViews || !options.dataViews[0]) return;

        //clear viewport . Remove Gauges.
        if (this.singleGaugeChartArray) {
            for (var i = 0; i < this.count; i++) {
                this.singleGaugeChartArray[i].remove();
            }
        }

        this.dataView = options.dataViews[0];
        var dataView = this.dataView;
        this.visualSettings = VisualSettings.parse<VisualSettings>(dataView);

        var gaugesDataModel = this.Convert(dataView);

        var viewport = options.viewport;
        this.root.attr('height', viewport.height);
        this.root.attr('width', viewport.width);

        let categoriesCount = gaugesDataModel.categories.length;

        this.count = categoriesCount;
        if (this.count >= 35)
            this.smallChart = true;
        else
            this.smallChart = false;

        if (this.count <= 3)
            this.bigChart = true;
        else
            this.bigChart = false;

        this.chartLayout = 0; // Horizontal.

        var gaugeViewport = this.getGaugeSize(viewport, this.count, this.chartLayout);

        // Create new charts.
        this.singleGaugeChartArray = new Array();
        if (this.chartLayout == 0) {
            //Horizontal layout . X changes and Y fixed.
            var localX = 0;
            var localY = 20;

            for (var i = 0; i < this.count; i++) {
                var singleDataModel: SingleGaugeChartDataViewModel = gaugesDataModel.categories[i];
                this.singleGaugeChartArray[i] = new SingleGaugeChart(singleDataModel, this.selectionManager, this.host);
                this.singleGaugeChartArray[i].update(this.root, localX, localY, gaugeViewport.width, gaugeViewport.height, gaugeViewport.width,
                    gaugeViewport.height, gaugeViewport.width, this.allowInteraction, this.smallChart, this.bigChart);
                localX = localX + gaugeViewport.width;
            }
        }
    }

    // tslint:disable-next-line: function-name
    private Convert(dataView: DataView): GaugeChartArrayDataViewModel {
        var category0: DataViewCategoryColumn;
        var value0: DataViewValueColumn;
        var value1: DataViewValueColumn;
        var value2: DataViewValueColumn;

        var model: GaugeChartArrayDataViewModel;

        var categoriesCount = 0;

        if (dataView.categorical.categories && dataView.categorical.categories.length > 0) {
            let categories = dataView.categorical.categories;
            category0 = categories[0];
            categoriesCount = category0.values.length;
        }

        let values = dataView.categorical.values;



        let labelsArray: string[] = [];
        if (categoriesCount == 0) {
            labelsArray.push("All");
        }
        else {
            for (var i = 0; i < categoriesCount; i++) {
                if (category0.values[i])
                    labelsArray.push(category0.values[i].toString());
            }
        }

        if (categoriesCount == 0)
            categoriesCount = 1;

        //values array.
        value0 = values[0];
        let valuesArray = [];
        for (var i = 0; i < categoriesCount; i++) {
            if (value0) {
                if (value0.values[i])
                    valuesArray.push(value0.values[i]);
                else
                    valuesArray.push(null);
            }
        }

        //target 1 array
        value1 = values[1];
        let target1Array = [];
        for (var i = 0; i < categoriesCount; i++) {
            if (value1) {
                if (value1.values[i])
                    target1Array.push(value1.values[i]);
                else
                    target1Array.push(null);
            }
        }

        //target 2 array
        value2 = values[2];
        let target2Array = [];
        for (var i = 0; i < categoriesCount; i++) {
            if (value2) {
                if (value2.values[i])
                    target2Array.push(value2.values[i]);
                else
                    target2Array.push(null);
            }
        }
        model = this.createChartArrayDataViewModel(labelsArray, valuesArray, target1Array, target2Array, category0);

        return model;
    }


    private createChartArrayDataViewModel(labels: string[], values = [], targets1 = [], targets2 = [], caterories: DataViewCategoryColumn): GaugeChartArrayDataViewModel {
        var model: GaugeChartArrayDataViewModel;
        let singleChartsArray: SingleGaugeChartDataViewModel[] = [];

        for (let i = 0; i < labels.length; i++) {

            const categorySelectionId = this.host.createSelectionIdBuilder()
                .withCategory(caterories, i)
                .createSelectionId();

            var value: number = values[i];
            var target1: number = targets1[i];
            var target2: number = targets2[i];

            if (value == null || target1 == null)
                continue;

            let item: SingleGaugeChartDataViewModel = {
                category: labels[i],
                value: value,
                target1: target1,
                target2: target2,
                numberFormatter: (d) => { return "$" + d3.format(",.0f")(d); },
                percentageFormatter: (d) => { if (d < 0) return "(" + d3.format(",.0f")(d) + "%)"; else return d3.format(",.0f")(d) + "%" },
                valueDisplayName: this.visualSettings.gauge.valueLabel,
                target1DisplayName: this.visualSettings.gauge.target1Label,
                target2DisplayName: this.visualSettings.gauge.target2Label,
                targetGapThreshold: this.visualSettings.gauge.GapThreshold,
                tooltip: {
                    target1Label: this.visualSettings.gauge.target1Tooltip,
                    target2Label: this.visualSettings.gauge.target2Tooltip,
                    valueLabel: this.visualSettings.gauge.valueTooltip
                },
                color: (d, t1, t2) => {
                    if (d / t1 >= 1 || (1 - (d / t1)) <= 0.01) return "green";
                    if ((d / t1) >= 0.95) return "orange";
                    return "red"
                },
                target1Gap: 100 * (value - target1) / target1,
                target2Gap: 100 * (value - target2) / target2,
                selectionId: categorySelectionId
            }
            singleChartsArray.push(item);
        }
        model = { categories: singleChartsArray }

        return model;
    }

    private getGaugeSize(viewport: IViewport, count: number, type: number): IViewport {
        var viewPortW = viewport.width;
        var viewPortH = viewport.height;

        //if big chart.
        if (count == 1) {
            return {
                width: 0.9 * viewPortW,
                height: 0.9 * viewPortH
            }
        }

        var cols = 6;

        var rows = Math.round(count / (cols))
        if (rows <= 3)
            rows = 4;

        if (rows > 6) {
            cols = 7;
            this.smallChart = true;
        }

        if (type == 0) {
            //horizontal layout.            
            var chartH = (viewPortH) / (rows + 2);
            if (rows > 10)
                chartH = (viewPortH) / (rows - 6);

            var chartW = ((viewPortW) / (cols + 0.5));
            return {
                width: chartW,
                height: chartH
            }

        } else {
            //Vertical layout.
            var chartW = viewPortW;
            var chartH = viewPortH / count;
        }
    }
}

export class SingleGaugeChart implements IVisual {
    private root: d3.Selection<Element, undefined, null, unknown>;
    private config: SingleGaugeChartConfig;
    private scale: d3.ScaleLinear<number, number>
    private r: number;
    private tickData: number[];
    private arc: any;
    private currentValueLbl: any;
    private target1ValueLbl: any;
    private target2ValueLbl: any;
    private target1Tspan: any;
    private targetGap1Tspan: any;
    private target2Tspan: any;
    private targetGap2Tspan: any;
    private gapValueLbl: any;
    private categoryLbl: any;
    private textVerticalSPacing: number;
    private dataViewModel: SingleGaugeChartDataViewModel;
    private foregroundArc: any;
    private selectionManager: ISelectionManager
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private host: IVisualHost;
    private targetsCount: number;
    private catLblVertical: number;


    constructor(_dataViewModel: SingleGaugeChartDataViewModel, _selectionManager: ISelectionManager, _host: IVisualHost) {
        this.setDataViewModel(_dataViewModel);
        this.setSelectionManager(_selectionManager);
        this.setHost(_host);
    }

    private createTooltipServiceWrapper(tooltipService: ITooltipService, rootElement: any, handleTouchDelay: number = 1): ITooltipServiceWrapper {
        return new TooltipServiceWrapper(tooltipService, rootElement, handleTouchDelay);
    }

    private configure(_element, _x, _y, _size, _height, _width, _clipHeight, _clipWidth, _enableInteraction, _smallChart, _bigChart) {
        this.config = {
            element: _element,
            size: _size,
            gaugeHeight: _height,
            gaugeWidth: _width,
            clipHeight: _clipHeight,
            clipWidth: _clipWidth,
            enableInteraction: _enableInteraction,
            ringInset: 20,
            ringWidth: 10,
            x: _x,
            y: _y,
            minValue: 0,
            maxValue: 10,
            minAngle: -90,
            maxAngle: 90,
            transitionMs: 750,
            majorTicks: 3,
            labelInset: 30,
            labelFormat: d3.format('.0f'),
            numberFormat: (d) => { return "$" + d3.format(",.1f")(d); },
            pecentageFormat: (d) => { return "(" + d3.format(",.1f")(d) + "%)"; },
            smallChart: _smallChart,
            bigChart: _bigChart
        }
    }

    private setDataViewModel(_dataViewModel: SingleGaugeChartDataViewModel) {
        this.dataViewModel = _dataViewModel;
    }

    private setSelectionManager(selectionManager: ISelectionManager) {
        this.selectionManager = selectionManager;
    }

    private setHost(_host: IVisualHost) {
        this.host = _host;
    }

    private deg2rad(deg) {
        return deg * Math.PI / 180;
    }

    private getFillColor(d, compRatio) {
        if (d == -1 && compRatio === undefined)
            return '#ddd';
        if (d < 0.95)
            return 'red';
        if (d >= 0.95 && d < 0.99)
            return 'orange';
        if (d > 0.99)
            return 'green';
    }

    private getTicks(): number[] {
        return [this.dataViewModel.value / this.dataViewModel.target1];
    }

    /** Function to return values rounded to closest ten power.

     */
    private scaleAndRoundValue(d: number): { "Value": number, "Unit": string } {
        if (d) {
            var p = 10;
            //return values rounded to 1M or 1K
            for (var i = 6; i >= 3; i--) {
                var power: number = Math.pow(p, i);
                var unit: string = "";
                if (d >= power) {
                    if (power == 1000000)
                        unit = "M"
                    if (power < 1000000 && power >= 1000)
                        unit = "K"
                    return {
                        "Value": Math.round(d / Math.pow(p, i)),
                        "Unit": unit
                    }
                }
            }
            //else return value wihout rounding
            return {
                "Value": d,
                "Unit": ""
            }
        }
    }

    private wrap(text, width, _x, _y) {
        text.each(function (d) {
            let text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1, // ems
                x = _x,
                y = _y,
                dy = 1,
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }

    @logExceptions()
    public init(_element, _x, _y, _size, _height, _width, _clipHeight, _clipWidth, _enableInteraction, _smallChart, _bigChart): void {

        this.configure(_element, _x, _y, _size, _height, _width, _clipHeight, _clipWidth, _enableInteraction, _smallChart, _bigChart);

        this.r = this.config.size / 2;

        //outer radius
        var oR = this.r - this.config.ringInset;

        //inner radius.
        var iR = oR - this.config.ringWidth;

        var range = this.config.maxAngle - this.config.minAngle;
        this.textVerticalSPacing = 15

        this.root = this.config.element
            .append('svg').attr('class', 'gauge');

        this.scale = d3.scaleLinear()
            .range([0, 1])
            .domain([this.config.minValue, this.config.maxValue]);

        this.tickData = this.getTicks();

        //background arcs.
        this.arc = d3.arc()
            .innerRadius(iR)
            .outerRadius(oR)
            .startAngle((d: any, i) => {
                var ratio = d * i;
                return (-90 + (ratio * range)) * Math.PI / 180;
            })
            .endAngle((d: any, i) => {
                var ratio = d * (i + 1);
                if (ratio > 1)
                    ratio = 1;
                return (-90 + (ratio * range)) * Math.PI / 180;
            });

        this.root.attr('height', this.config.gaugeHeight);
        this.root.attr('width', this.config.gaugeWidth);

        this.catLblVertical = oR - 2.5 * this.config.ringWidth;

        var texts = this.root.append('g').attr('class', 'textGroup');

        if (this.config.bigChart) {
            this.categoryLbl = texts.append("text")
                .attr("transform", this.centerTranslation(this.r, this.catLblVertical))
                .attr("text-anchor", "middle")
                .attr("class", "categoryTextLarge")
        } else {
            this.categoryLbl = texts.append("text")
                .attr("transform", this.centerTranslation(this.r, 1.35 * this.catLblVertical))
                .attr("text-anchor", "middle")
                .attr("class", "categoryText")
        }

        //Value
        this.currentValueLbl = texts.append("text")
            .attr("transform", this.centerTranslation(this.r, this.catLblVertical + 1.25 * this.textVerticalSPacing))
            .attr("text-anchor", "middle")
            .attr("class", "valueLabelText")

        // Target1
        if (this.dataViewModel.target1) {
            var y = this.catLblVertical + 2.75 * this.textVerticalSPacing;
            this.target1ValueLbl = texts.append("text")
                .attr("transform", this.centerTranslation(this.r, y))
                .attr("text-anchor", "middle")
                .attr("class", "valueLabelText");

            this.target1Tspan = this.target1ValueLbl.append('tspan');
            this.targetGap1Tspan = this.target1ValueLbl.append('tspan');
        }

        if (this.dataViewModel.target2) {
            var y = this.catLblVertical + 3.5 * this.textVerticalSPacing;
            this.target2ValueLbl = texts.append("text")
                .attr("transform", this.centerTranslation(this.r, y))
                .attr("text-anchor", "middle")
                .attr("class", "valueLabelText");

            this.target2Tspan = this.target2ValueLbl.append('tspan');
            this.targetGap2Tspan = this.target2ValueLbl.append('tspan');

            if (this.config.bigChart) {
                this.target2ValueLbl = this.target2ValueLbl.attr("class", "textLarge");
            }

        }

        if (this.config.bigChart) {
            this.currentValueLbl = this.currentValueLbl.attr("class", "textLarge");
            this.target1ValueLbl = this.target1ValueLbl.attr("class", "textLarge");
        }

        this.tooltipServiceWrapper = this.createTooltipServiceWrapper(this.host.tooltipService, this.root);
    }

    /**
     */
    private centerTranslation(_x, _y) {
        return 'translate(' + _x + ',' + _y + ')';
    }

    // tslint:disable-next-line: max-func-body-length
    @logExceptions()
    public update(_element, _x, _y, _size, _height, _width, _clipHeight, _clipWidth, _enableInteraction, _smallChart, _bigChart) {

        this.init(_element, _x, _y, _size, _height, _width, _clipHeight, _clipWidth, _enableInteraction, _smallChart, _bigChart);

        var centerTx = this.centerTranslation(this.r, 0.85 * this.r);

        if (this.config.bigChart)
            centerTx = this.centerTranslation(this.r, this.r);

        var fillColorFn = this.getFillColor;
        //outer radius
        var oR = this.r - this.config.ringInset;

        //inner radius.
        var iR = oR - this.config.ringWidth;


        if (this.dataViewModel.target1) {
            //Background arc.
            var background = this.root.append('g')
                .attr('class', 'gaugeBackground')
                .attr('transform', centerTx);


            background.selectAll('path')
                .data([1])
                .enter().append('path')
                .attr("fill", "lightgrey")
                .attr('d', this.arc);
        }

        //Background 2
        if (this.dataViewModel.target2) {
            var background2 = this.root.append('g')
                .attr('class', 'gaugeBackground2')
                .attr('transform', centerTx);

            background2.selectAll('path')
                .data([this.dataViewModel.target1 / this.dataViewModel.target2])
                .enter().append('path')
                .attr("fill", "darkgrey")
                .attr('d', this.arc);
        }
        //Foreground arcs.
        this.foregroundArc = this.root.append('g');


        this.foregroundArc.attr('class', 'arc')
            .attr('transform', centerTx);

        var compRatio = 1
        if (this.dataViewModel.target2)
            var compRatio = this.dataViewModel.target1 / this.dataViewModel.target2;

        var path = this.foregroundArc.selectAll('path')
            .data(this.tickData)
            .enter().append('path')
            .attr("fill", (d, i) => {
                return fillColorFn(d, compRatio);
            }).attr('d', this.arc);

        var displayStar: boolean = false;

        //If target acheived the visual will display a golden star next to chart's end.
        if (this.dataViewModel.targetGapThreshold != -1) {


            if (this.dataViewModel.target2 && (this.dataViewModel.target2Gap) >= this.dataViewModel.targetGapThreshold) {
                //if two targets selected.
                displayStar = true;
            } else if ((this.dataViewModel.target1Gap) >= this.dataViewModel.targetGapThreshold) {
                // if one target selected.
                displayStar = true;
            }


            if (displayStar == true) {
                var lg = this.root.append('g')
                    .attr('class', 'label')
                    .attr('transform', centerTx);

                lg.selectAll('text')
                    .data([1])
                    .enter().append('text')
                    .attr('transform', (d: number) => {
                        var newAngle = -95;
                        return 'rotate(' + newAngle + ') translate(0,' + 0.95 * this.r + ')';
                    }).text("\u2B50");
            }

        }

        var valueLbl = this.scaleAndRoundValue(this.dataViewModel.value);
        var target1Lbl = this.scaleAndRoundValue(this.dataViewModel.target1);
        if (this.dataViewModel.target2)
            var target2Lbl = this.scaleAndRoundValue(this.dataViewModel.target2);


        //Category label.

        //label inside chart.           
        if (this.config.smallChart) {
            if (this.dataViewModel.category.length >= 30) {
                this.categoryLbl.text(this.dataViewModel.category).attr('class', 'categoryTextSmall')
                    .call(this.wrap, 50, 0, this.catLblVertical - this.textVerticalSPacing - iR);
            } else {
                this.categoryLbl.text(this.dataViewModel.category).attr('class', 'categoryTextSmall')
                    .call(this.wrap, 100, 0, this.catLblVertical - 0.8 * this.textVerticalSPacing - iR);
            }
        }
        else {
            if (this.dataViewModel.category.length >= 50) {
                this.categoryLbl.text(this.dataViewModel.category).attr('class', 'categoryTextSmall')
                    .call(this.wrap, 100, 0, this.catLblVertical - 1.5 * this.textVerticalSPacing - iR);
            } else
                this.categoryLbl.text(this.dataViewModel.category)
                    .call(this.wrap, 100, 0, this.catLblVertical - 1.5 * this.textVerticalSPacing - iR);
        }

        if (this.dataViewModel.target2) {
            this.currentValueLbl.text(this.dataViewModel.valueDisplayName + " " + this.config.numberFormat(valueLbl.Value) + valueLbl.Unit);
            //target1 
            this.target1Tspan.text(this.dataViewModel.target1DisplayName + " " +
                this.config.numberFormat(target1Lbl.Value) + target1Lbl.Unit)
            this.targetGap1Tspan.text(",Gap " + this.config.pecentageFormat(this.dataViewModel.target1Gap));

            //target2
            this.target2Tspan.text(this.dataViewModel.target2DisplayName + " " +
                this.config.numberFormat(target2Lbl.Value) + target2Lbl.Unit)
            this.targetGap2Tspan.text(",Gap " + this.config.pecentageFormat(this.dataViewModel.target2Gap));

        } else {
            this.currentValueLbl.text(this.dataViewModel.valueDisplayName + " " + this.config.numberFormat(valueLbl.Value) + valueLbl.Unit);
            this.target1Tspan.text(this.dataViewModel.target1DisplayName + " " +
                this.config.numberFormat(target1Lbl.Value) + target1Lbl.Unit)
            this.targetGap1Tspan.text(",Gap " + this.config.pecentageFormat(this.dataViewModel.target1Gap));

        }

        this.tooltipServiceWrapper.addTooltip(this.root.selectAll('.arc'),
            (tooltipEvent: TooltipEventArgs<number>) => this.getTooltipData(this.dataViewModel),
            (tooltipEvent: TooltipEventArgs<number>) => this.dataViewModel.selectionId);
    }


    private getTooltipData(value: SingleGaugeChartDataViewModel): VisualTooltipDataItem[] {
        if (this.dataViewModel.target2) {
            return [{
                displayName: this.dataViewModel.tooltip.valueLabel,
                value: value.numberFormatter(value.value),
                color: this.dataViewModel.color(this.dataViewModel.value, this.dataViewModel.target1, this.dataViewModel.target2),
                header: value.category
            },
            {
                displayName: this.dataViewModel.tooltip.target1Label,
                value: value.numberFormatter(value.target1),
                color: "",
                header: value.category
            },
            {
                displayName: this.dataViewModel.tooltip.target2Label,
                value: value.numberFormatter(value.target2),
                color: "",
                header: value.category
            },
            ];
        } else {
            return [{
                displayName: this.dataViewModel.tooltip.valueLabel,
                value: value.numberFormatter(value.value),
                color: this.dataViewModel.color(this.dataViewModel.value, this.dataViewModel.target1, this.dataViewModel.target2),
                header: value.category
            },
            {
                displayName: this.dataViewModel.tooltip.target1Label,
                value: value.numberFormatter(value.target1),
                color: "",
                header: value.category
            }
            ];
        }
    }

    private enableInteraction(enableInteraction: boolean) {
        if (enableInteraction) {
            this.foregroundArc.on('click', (d) => {
                //this.selectionManager.select(this.dataViewModel.selectionId);                
            });
        }
    }

    public remove() {
        this.root.remove();
    }
}


export function logExceptions(): MethodDecorator {
    // tslint:disable-next-line: no-function-expression
    return function (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> {
        return {
            value: function () {
                try {
                    return descriptor.value.apply(this, arguments);
                } catch (e) {
                    console.error(e);
                    throw e;
                }
            }
        }
    }
}


