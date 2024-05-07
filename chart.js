let mkRoot = id => {
  let root = am5.Root.new(id); 
  root.container.set('layout', root.verticalLayout);
  root.setThemes([
    am5themes_Animated.new(root)
  ]);
  root.numberFormatter.set("numberFormat", "#.0a");
  return root;
};

let mkChart = root =>
  root.container.children.push(
    am5xy.XYChart.new(root, {
      panX:       true,
      panY:       false,
      wheelY:     "zoomX",
      pinchZoomX: true,
      pinchZoomY: true,
      layout:     root.horizontalLayout,
      //maxTooltipDistance: 50,
      cursor:     am5xy.XYCursor.new(root, {}),
      scrollbarX: am5xy.XYChartScrollbar.new(root, {
        orientation: 'horizontal'
      }),
      scrollbarY: am5xy.XYChartScrollbar.new(root, {
        orientation: 'vertical'
      })
    })
  );

let mkYAxis = (root, chart, unit) => {
  let yAxis = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
      autoZoom:          false,
      visible:           false,
      renderer:          am5xy.AxisRendererY.new(root, {
        minGridDistance: 20,
        opposite:        true
      }),
      userData: {
        unit: unit
      }
    })
  );
  yAxis.get("renderer").labels.template.setAll({
    fontSize: "0.75em"
  });
  yAxis.get("renderer").grid.template.setAll({
    strokeWidth: 1,
    stroke: am5.color(0xAAAAAA),
  });
  yAxis.set("tooltip", am5.Tooltip.new(root, {}));
  return yAxis;
};

let mkXAxis = (root, chart) => {
  let xAxis = chart.xAxes.push(
    am5xy.DateAxis.new(root, {
      baseInterval: { timeUnit: "minute", count: 1 },
      renderer:     am5xy.AxisRendererX.new(root, {
        minGridDistance: 50
      })
    })
  );
  xAxis.set("tooltip", am5.Tooltip.new(root, {}));
  xAxis.get("renderer").labels.template.setAll({
    fontSize:      "0.75em",
    location:      0,
    multiLocation: 0
  });
  return xAxis;
};

let mkSeriesConstructor = (root, chart, xAxis, unit) => name => {
  let ret = am5xy.LineSeries.new(root, { 
    name:              name,
    xAxis:             xAxis,
    yAxis:             mkYAxis(root, chart, unit),
    baseAxis:          xAxis,
    valueYField:       "measurement",
    valueXField:       "instant",
    visible:           false,
    minDistance:       10,
    snapTooltip:       true,
    tooltip: am5.Tooltip.new(root, {
      labelText: "{name}\n{measurement}{yAxis.userData.unit} @ {instant.formatDate('yyyy-MM-dd HH:mm')}",
      dy:        -50,
    }),
    userData:          { data: [] }
  });
  ret.get("tooltip").get("background").setAll({
    fillOpacity: 0.2
  });
  ret.on('visible', visible => {
    if (visible) {
      ret.data.setAll(ret.get('userData').data);
    } else {
      ret.data.setAll([]);
    }
  });
  chart.series.push(ret);
  
  return ret;
};

let mkButton = (root, legend, text, color) => {
  let ret = legend.children.push(am5.Button.new(root, {
    active:      true,
    width:       20,
    height:      20,
    dx:          4,
    marginTop:   6,
    fill:        am5.color(color),
    tooltipText: text
  }));
  ret.get('background').setAll({
    fill: am5.color(color)
  });
  return ret;
};

let mkCurrentTimeRange = (dateFns, dateFnsTz, root, chart, xAxis) => data => {
  let now = new Date();
  let currentTime = xAxis.makeDataItem({
    value:    dateFns.addMinutes(now, -1).getTime(),
    endValue: dateFns.addMinutes(now, 1).getTime()
  });

  let axisFill = xAxis.createAxisRange(currentTime).get("axisFill");
  axisFill.setAll({
      fill:          am5.color('#85c7fc'),
      stroke:        am5.color('#85c7fc'),
      fillOpacity:   1,
      strokeWidth:   5,
      visible:       true,
      tooltip:       am5.Tooltip.new(root, {}),
      tooltipY:      0,
      showTooltipOn: "always"
  });
  axisFill.get("tooltip").adapters.add("bounds", () => chart.plotContainer.globalBounds());

  axisFill.adapters.add("tooltipText", (text, target) => {
    let instant = target.dataItem.get('value');
    let price = () => data.findLast(x => x.instant <= instant).centsPerKWh;
    return dateFnsTz.formatInTimeZone(new Date(instant), 'Europe/Helsinki', "yyyy-MM-dd HH:mm") +
          (data.length == 0 ? '' : "\n" + (price() > 0 ? price().toFixed(2) + " + " + (price()*0.24).toFixed(2) + " = " + (price()*1.24).toFixed(2) : price()) + " c/kwh");
  });
  return currentTime;
};

let mkWeekendRanges = (dateFns, root, xAxis) => interval => {
  dateFns.eachWeekendOfInterval(interval).forEach(x => {
    let weekend = xAxis.createAxisRange(xAxis.makeDataItem({
      value:    x.getTime(),
      endValue: dateFns.addHours(x, 24).getTime()
    }));
    weekend.set("userData", { weekend: true });
    weekend.get("axisFill").setAll({
        visible:      true,
        fillOpacity:  0.5,
        fillGradient: am5.LinearGradient.new(root, {
          stops: [{
            color: am5.color("#000000")
          }, {
            color: am5.color("#ffffff"),
            offset: 0.30
          }, {
            color: am5.color("#ffffff")
          }]
        })
    });
  });
};

let mkNightRanges = (dateFns, dateFnsTz, xAxis) => interval => {
  dateFns.eachDayOfInterval(interval).forEach(x => {
    let night = xAxis.createAxisRange(xAxis.makeDataItem({
      value:    dateFnsTz.zonedTimeToUtc(new Date(dateFnsTz.formatInTimeZone(x,                     'Europe/Helsinki', 'yyyy-MM-dd') + 'T22:00:00'), 'Europe/Helsinki').getTime(),
      endValue: dateFnsTz.zonedTimeToUtc(new Date(dateFnsTz.formatInTimeZone(dateFns.addDays(x, 1), 'Europe/Helsinki', 'yyyy-MM-dd') + 'T07:00:00'), 'Europe/Helsinki').getTime(),
    }));
    night.set("userData", { night: true });
    night.get("axisFill").setAll({
        fill:        am5.color('#0000ff'),
        fillOpacity: 0.05,
        visible:     true
    });
  });
};

let initData = series => data => {
  data = data.sort((a,b) => a.instant - b.instant);
  series.get("userData").data = data;
  if (!series.isHidden()) {
    series.data.setAll(data);
  }
};

let mkRangeInitializer = (dateFns, dateFnsTz, root, chart, xAxis, showWeekendsF, showNightsF) => (data, includeNightsAndWeekends) => {
  xAxis.axisRanges.clear();

  let currentTime = mkCurrentTimeRange(dateFns, dateFnsTz, root, chart, xAxis)(data);
  setInterval(() => {
    let now = new Date();
    currentTime.setAll({
      value:    now.getTime() - 1000*60*1,
      endValue: now.getTime() + 1000*60*1
    });
  }, 60000);

  let interval = {
    start: Math.min(...data.map(x => x.instant)),
    end:   Math.max(...data.map(x => x.instant))
  };

  if (includeNightsAndWeekends && showWeekendsF()) {
    mkWeekendRanges(dateFns, root, xAxis)(interval);
  }

  if (includeNightsAndWeekends && showNightsF()) {
    mkNightRanges(dateFns, dateFnsTz, xAxis)(interval);
  }
};

let mkLegend = (root, chart) => {
  let legend = chart.children.push(am5.Legend.new(root, {
    layout: root.verticalLayout,
    height: am5.percent(100),
    verticalScrollbar: am5.Scrollbar.new(root, {
      orientation: "vertical"
    })
  }));
  legend.markers.template.setAll({
    forceHidden: true
  });
  legend.labels.template.setAll({
    fontSize: 8,
    fontWeight: "300",
    height: 4,
  });
  legend.valueLabels.template.set("forceHidden", true);
  return legend;
}

let initChart = (root, visibleSeries, dateFns, dateFnsTz, onVisible) => {
  let chart = mkChart(root);
  let xAxis = mkXAxis(root, chart);

  xAxis.on("start", function() {
    syncAxes(root.container.children.values, chart);
  });
  xAxis.on("end", function() {
    syncAxes(root.container.children.values, chart);
  });

  let legend = mkLegend(root, chart);
  legend.data.setAll([]);

  return (seriesName, type, data) => {
    var series = chart.series.values.find(x => x.get('name') === seriesName);
    if (type === undefined) {
      return !series.isHidden();
    }

    if (!series) {
        series = type === 'T' ? mkSeriesConstructor(root, chart, xAxis, '°C')(seriesName) :
                 type === 'R' ? mkSeriesConstructor(root, chart, xAxis, '%')(seriesName) :
                 type === 'F' ? mkSeriesConstructor(root, chart, xAxis, '')(seriesName) :
                 type === 'P' ? mkSeriesConstructor(root, chart, xAxis, 'W')(seriesName) :
                 type === 'E' ? mkSeriesConstructor(root, chart, xAxis, 'Wh')(seriesName) :
                 type === 'C' ? mkSeriesConstructor(root, chart, xAxis, 'c/kWh')(seriesName) :
                 type === 'B' ? mkSeriesConstructor(root, chart, xAxis, 'B')(seriesName) :
                 type === 'b' ? mkSeriesConstructor(root, chart, xAxis, 'bar')(seriesName) :
                 type === 'W' ? mkSeriesConstructor(root, chart, xAxis, 'b/s')(seriesName) :
                 type === 'M' ? mkSeriesConstructor(root, chart, xAxis, 's')(seriesName) :
                 type === 'V' ? mkSeriesConstructor(root, chart, xAxis, 'V')(seriesName) :
                 type === 'A' ? mkSeriesConstructor(root, chart, xAxis, 'A')(seriesName) :
                 type === 'p' ? mkSeriesConstructor(root, chart, xAxis, 'ppm')(seriesName) :
                 type === 'l' ? mkSeriesConstructor(root, chart, xAxis, 'l/min')(seriesName) :
                 undefined;
        if (type === '?') {
          console.log("Unknown type for " + seriesName);
        }
        let all = legend.data.values.concat([series]);
        all.sort((a,b) => a.get('name') < b.get('name') ? -1 : 1);
        legend.data.setAll(all);
        if (!visibleSeries.includes(seriesName)) {
          series.hide();
        } else {
          series.show();
          series.get('yAxis').set('visible', true);
          onVisible(seriesName, true);
        }

        series.on('visible', visible => {
          series.get('yAxis').set('visible', visible);
          onVisible(seriesName, visible);
        });
    }
    if (data) {
      initData(series)(data);
    }
    return false;
  };
};

let syncAxes = (chartsToSync, targetChart) => {
  var targetAxis = targetChart.xAxes.getIndex(0);
  if (targetAxis._skipSync != true) {
    var start = targetAxis.get("start");
    var end = targetAxis.get("end");
    am5.array.each(chartsToSync, function(chart) {
      if (chart != targetChart) {
        var axis = chart.xAxes.getIndex(0);
        axis._skipSync = true;
        axis.setAll({
          start: start,
          end: end
        })
        axis._skipSync = false;
      }
    });
  }
}

let parseType = (group, graph) =>
  graph.startsWith('RELAT') || graph == 'wifi_strength' || graph == 'ah' || graph.endsWith('Fan') ?
    'R' :
  graph.endsWith('_W') || graph.endsWith('_w') || graph == 'TOTAL_ACTIVE_POWER' ?
    'P' :
  graph.endsWith('_PRESSURE') ?
    'b' :
  graph.endsWith('_bytes') ?
    'B' :
  graph.endsWith('_v') ?
    'V' :
  graph == 'co2' ?
    'p' :
  graph == 'FLOW_RATE' ?
    'l' :
  graph.endsWith('_a') ?
    'A' :
  graph.endsWith('_bandwidth') ?
    'W' :
  graph.indexOf('_latency_') > -1 || graph.endsWith('_elapsed') || graph.indexOf('ping') > -1 || group == 'ping' || graph == 'VD_DHW' || graph == 'VD_HEATING' || graph == 'VD_COOLING' ?
    'M' :
  graph.endsWith('WH') || graph.endsWith('kwh') || graph.endsWith('_HEAT') || graph.endsWith('_POWER') || graph.endsWith('_YIELD') ?
    'E' :
  graph.endsWith('MODE') || graph.endsWith('OFF') || graph.endsWith('STATUS') || graph.endsWith('RESET') ?
    'F' :
  graph.toUpperCase().indexOf('TEMPERATURE') > -1 || graph.indexOf('_TEMP_') > -1 || graph.endsWith('Temp') ?
    'T' :
  graph == 'spot' ?
    'C' :
    '?';

let parseMultiplier = (group, graph) =>
  graph.endsWith('_kwh') ?
    1000 :
  graph.endsWith('_bandwidth') ?
    8 :
  graph.endsWith('VD_DHW') || graph.endsWith('VD_HEATING') || graph.endsWith('VD_COOLING') ?
    3600 :
  graph.indexOf('_latency_') > -1 || graph.endsWith('_elapsed') || graph.indexOf('ping') > -1 || group == 'ping' ?
    0.001 :
    1;