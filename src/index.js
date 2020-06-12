import {select, selectAll} from 'd3-selection';
import {csv} from 'd3-fetch';
import {scaleLinear, scaleOrdinal, scaleBand} from 'd3-scale';
import {range, min, max} from 'd3-array';
import {axisBottom, axisLeft} from 'd3-axis';
import {line} from 'd3-shape';
import {getDomain} from './utils';
import {stats} from 'science';
import {annotationCalloutElbow} from 'd3-svg-annotation';
import {annotationCustomType} from 'd3-svg-annotation';
import {annotation} from 'd3-svg-annotation';

const domReady = require('domready');

domReady(() => {
  csv('./data/hexmap.csv')
    .then(data => myVis(data));
});

function myVis(data) {
  // The posters will all be 24 inches by 36 inches
  // Your graphic can either be portrait or landscape, up to you
  // the important thing is to make sure the aspect ratio is correct.

  // landscape
  const height = 2000;
  const width = 36 / 24 * height;
  const margin = {left: 20, right: 20, top: 20, bottom: 20};
  const plotHeight = height - margin.top - margin.bottom;
  const plotWidth = width - margin.left - margin.right;

  const svg = select('.vis-container')
    .attr('width', width)
    .attr('height', height);

  svg.append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#F5F5F5');

  const mapCont = svg.append('g')
    .attr('class', 'map-container')
    .attr('width', 2 * plotWidth / 3)
    .attr('height', plotHeight / 2)
    .attr('transform', `translate(${plotWidth / 3},${margin.top})`);

  const denCont = svg.append('g')
    .attr('class', 'density-container')
    .attr('width', plotWidth / 3)
    .attr('height', plotHeight)
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const scatterplotCont = svg.append('g')
    .attr('class', 'scatterplot-container')
    .attr('width', plotWidth / 2.3)
    .attr('height', plotHeight / 3)
    .attr('transform', `translate(${plotWidth / 3 + 100},${(2 * plotHeight / 3) + margin.top})`);

  buildHexMap(mapCont);
  buildDenPlots(denCont);
  buildScatterplot(scatterplotCont);

  svg.append('text')
    .attr('class', 'main-title')
    .attr('x', (2 * plotWidth) / 3.175)
    .attr('y', 75)
    .attr('text-anchor', 'middle')
    .attr('font-size', 75)
    .attr('font-family', 'Nunito')
    .text('Political Polarization in the U.S., 1987-2017');

  svg.append('text')
    .attr('class', 'main-title-byline')
    .attr('x', (2 * plotWidth) / 3.175)
    .attr('y', 150)
    .attr('text-anchor', 'middle')
    .attr('font-size', 50)
    .attr('font-family', 'Nunito')
    .text('Masha Boyarinova, Lily Li, and Jacob Spiegel');

  const wrappedTitleText = `<text id="wrapped-density-text" font-size="35"
   font-family="Nunito" text-anchor="middle">
   <tspan x="400" y="50">Recently, the country has felt more fractured than ever,
    but is this actually true? We answer this question by using</tspan>
   <tspan x="400" y="90">Congressional DW-NOMINATE scores from
   1987 to 2017. DW-NOMINATE is a spatial model that places politicians</tspan>
   <tspan x="400" y="130">on a -1 to 1 scale, representing the liberal-conservative scale.
   We examine political polarization
   via three lenses:</tspan>
   <tspan x="400" y="170">density plots that show the changes in the distribution of scores across</tspan>
   <tspan x="400" y="210">congressional terms, a U.S. map that shows changes in each state, and a</tspan>
   <tspan x="400" y="250">scatterplot that shows the nature of the change. Together, these graphics</tspan>
   <tspan x="400" y="290">confirm that polarization is increasing in the U.S.</tspan>
   </text>`;

  svg.append('g').html(wrappedTitleText)
    .attr('transform', 'translate(1450, 175)');

  const type = annotationCustomType(
    annotationCalloutElbow,
    {connector: {type: 'elbow',
      end: 'arrow'}});

  const annotations = [{
    note: {
      label: `The angle and opacity of the arrow denote change in extremism
      between 1987 and 2007 (upwards is more extreme, downwards is less)`,
      title: 'Arrow'
    },
    x: 2450,
    y: 1120,
    dy: -100,
    dx: 222
  },
  {
    note: {
      label: 'The abbreviation of the state name',
      title: 'Abbreviation'
    },
    x: 2445,
    y: 1175,
    dy: 365,
    dx: 130
  },
  {
    note: {
      label: `Color denotes the political leaning of the state in 2017
      (blue = Democrat, red = Republican, white = split)`,
      title: 'Color'
    },
    x: 2453,
    y: 1150,
    dy: 30,
    dx: 215
  },
  {
    note: {
      label: 'This tile represents the median U.S. state',
      title: 'Median State'
    },
    x: 2417,
    y: 1215,
    dy: 515,
    dx: 0
  }];

  const makeAnnotations = annotation()
    .type(type)
    .textWrap(300)
    .annotations(annotations);

  select('svg')
    .append('g')
    .attr('class', 'annotation-group')
    .attr('className', 'annotation')
    .attr('font-family', 'Nunito')
    .attr('font-size', '35')
    .call(makeAnnotations);

  selectAll('.annotation path')
    .attr('stroke', '#000')
    .attr('stroke-width', '2');

  selectAll('.annotation text')
    .attr('fill', '#000');

  selectAll('.connector-arrow')
    .attr('fill', '#000');
}

function buildHexMap(svg) {
  // tunable (ie you can change them if you want) parameters for modifying the size of hexes
  const scaling = 1;
  const hexWidth = svg.attr('height') / 7;

  // grab the the hexmap csv
  csv('./data/hexmap.csv')
    .then(data => {
      const colorScale = scaleLinear()
        .domain([-1, 0, 1])
        .range(['blue', 'white', 'red']);

      // build a wrapper to put the hexes in
      const extremismDomain = getDomain(data, 'extremism_change');
      const opacityScale = scaleLinear()
        .domain([-extremismDomain.max, 0, extremismDomain.max])
        .range([1, 0.2, 1]);

      const hexWrapper = svg.append('g')
        .attr('class', 'hex-wrapper')
        .attr('transform', `translate(${100}, ${300})`);
      // the hexes are stored in gs

      const hexContainers = hexWrapper.selectAll('.state-hex').data(data)
        .enter()
        .append('g')
        .attr('transform', d => {
          const hexRow = Number(d.HexRow);
          const hexCol = Number(d.HexCol);
          const pos = [
            hexWidth * (-2 + hexCol + 0.5 * hexRow),
            1 + hexWidth * (-0.3 + 0.5 * Math.sqrt(3) * hexRow)
          ];
          return `translate(${pos[0]}, ${pos[1]})`;
        });

      hexContainers.append('path')
        .attr('d', d => {
          const dx = scaling * hexWidth / 2;
          const hexY = scaling * hexWidth / Math.sqrt(3);
          const dy = hexY / 2;
          const constructedPath = `M${(-dx)},${dy}
            l${dx},${dy}
            l${dx},${-dy}
            l0,${-hexY}
            l${-dx},${-dy}
            l${-dx},${dy} Z`;
          return constructedPath;
        })
        .attr('fill', d => colorScale(d.current_score))
        .attr('stroke', 'black')
        .attr('stroke-width', '2');

      const fontSize = 80;
      hexContainers.append('text')
        .attr('class', 'state-hex-label')
        // tune label placement
        .attr('x', 0)
        .attr('y', fontSize / 4 + (scaling * hexWidth / Math.sqrt(3) / 2))
        .attr('text-anchor', 'middle')
        .attr('font-size', fontSize / 2)
        .attr('font-family', 'Nunito')
        .text(d => d.StateAbbr);

      hexContainers.append('line')
        .attr('x1', '0')
        .attr('y1', d => {
          const hexY = scaling * hexWidth / Math.sqrt(3);
          const dy = hexY / 2;
          return dy * -d.extremism_change * 3;
        })
        .attr('x2', d => {
          const dx = scaling * hexWidth / 2;
          return 4 * dx / 5;
        })
        .attr('y2', '0')
        .attr('stroke', 'black')
        .attr('opacity', d => opacityScale(d.extremism_change))
        .attr('stroke-width', 10);

      hexContainers.append('line')
        .attr('x1', '0')
        .attr('y1', d => {
          const hexY = scaling * hexWidth / Math.sqrt(3);
          const dy = hexY / 2;
          return dy * -d.extremism_change * 3;
        })
        .attr('x2', d => {
          const dx = scaling * hexWidth / 2;
          return -4 * dx / 5;
        })
        .attr('y2', '0')
        .attr('stroke', 'black')
        .attr('opacity', d => opacityScale(d.extremism_change))
        .attr('stroke-width', 10);
    });
}

function buildDenPlots(svg) {
  csv('./data/density_data.csv')
    .then(data => {
      const ideologyScale = scaleOrdinal()
        .domain(['-1', '0', '1'])
        .range([0, 350, 700]);

      const marginTop = 220;
      const marginLeft = 30;
      const numPlots = 15;
      const densityPlotHeight = (svg.attr('height') - marginTop) / numPlots;

      const axisHeight = 10;
      let lineY = marginTop - axisHeight;
      let yPlot = marginTop + densityPlotHeight / 2;
      let yAxis = marginTop + densityPlotHeight - axisHeight + 1;
      let yearLabelY = marginTop + 3 * densityPlotHeight / 4;

      data.forEach(function createDensityPlot(n) {
        const parties = [n.D_nominate_dim1, n.R_nominate_dim1];
        const cont = svg.append('g');
        buildDensityCurves(cont, parties, marginLeft, yPlot, lineY, densityPlotHeight);

        cont.append('g')
          .call(axisBottom(ideologyScale))
          .attr('transform', `translate (${marginLeft}, ${yAxis})`)
          .attr('font-size', 25)
          .attr('font-family', 'Nunito');

        cont.append('text')
          .text(`${n.year}`)
          .attr('transform', `translate (0, ${yearLabelY})`)
          .attr('font-size', 30)
          .attr('font-family', 'Nunito');

        yAxis += densityPlotHeight;
        yPlot += densityPlotHeight;
        yearLabelY += densityPlotHeight;
        lineY += densityPlotHeight;
      });

      const wrappedDensityText = `<text id="wrapped-density-text" font-size="35"
       font-family="Nunito" text-anchor="middle">
       <tspan x="400" y="50">These plots show the density distributions of DW-</tspan>
       <tspan x="400" y="90">NOMINATE scores for each party (<tspan fill="blue">Democrat</tspan>,
         <tspan x="400" y="130"><tspan fill="red">Republican</tspan>).
         While the median scores for each</tspan>
       <tspan x="400" y="170">party have not shifted much, the distributions
       </tspan><tspan x="400" y="210">have diverged greatly.
       </tspan></text>`;

      svg.append('g').html(wrappedDensityText)
        .attr('transform', 'translate(0,-20)');
    });
}

function buildDensityCurves(svg, parties, x, y, lineY, densityPlotHeight) {
  const xScale = scaleLinear().domain([-1, 1]).range([0, 700]);
  const yScale = scaleLinear().domain([0, 1]).range([50, 0]);

  const colors = ['#0000ff', '#ff0000'];
  const medColors = ['#000069', '#670101'];

  parties.forEach((d, i) => {
    // clean data from a string of numbers into a js array
    const stringScores = d.slice(1, d.length - 1).split(', ');
    const scores = stringScores.map(h => Number(h));

    const ticks = range(-1, 1, 0.01);
    const kde = stats.kde().sample(scores);
    const lineShape = line()
      .x(h => xScale(h[0]))
      .y(h => yScale(h[1]));

    svg.append('path')
      .attr('stroke-width', 0.5)
      .attr('fill', colors[i])
      .attr('fill-opacity', 0.5)
      .attr('d', lineShape(kde(ticks)))
      .attr('transform', `translate (${x}, ${y})`);

    scores.sort((a, b) => a - b);
    const lowMiddle = Math.floor((scores.length - 1) / 2);
    const highMiddle = Math.ceil((scores.length - 1) / 2);
    const median = (scores[lowMiddle] + scores[highMiddle]) / 2;

    svg.append('line')
      .attr('x1', xScale(median))
      .attr('x2', xScale(median))
      .attr('y1', lineY)
      .attr('y2', lineY + densityPlotHeight)
      .attr('stroke-width', 6)
      .attr('stroke', medColors[i])
      .attr('stroke-dasharray', 5)
      .attr('transform', `translate(${x},0)`);
  });
}

function buildScatterplot(svg) {
  csv('./data/scatterplot_df_data.csv')
    .then(data => {
      const margin = {left: 50, right: 100, top: 50, bottom: 50};

      const xScale = scaleBand()
        .domain(data.map(function mapData(d) {
          return d.starting_yr;
        }))
        .rangeRound([margin.left, svg.attr('width') - margin.right])
        .padding([0.1]);

      const yScale = scaleLinear()
        .domain([min(data, d => d.polarization_percentage) - 1,
          max(data, d => d.polarization_percentage) + 1])
        .range([svg.attr('height') - margin.top - margin.bottom - 50, 0])
        .nice();

      const connectingLine = line()
        .x(d => xScale(d.starting_yr))
        .y(d => yScale(d.polarization_percentage));

      svg.append('path')
        .attr('transform', `translate(${xScale.bandwidth() * 1.24},${svg.attr('height') / 12})`)
        .attr('stroke', 'orange')
        .attr('stroke-width', 5)
        .attr('fill', 'none')
        .attr('d', connectingLine(data));

      svg.selectAll('.dot')
        .data(data)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('r', 15)
        .attr('cx', d => xScale(d.starting_yr) + xScale.bandwidth() * 1.24)
        .attr('cy', d => yScale(d.polarization_percentage) + svg.attr('height') / 12)
        .attr('fill', 'orange');

      buildXAxis(svg, xScale, margin, 'Starting Year Of Congressional Term');
      buildYAxis(svg, yScale, margin, 'Polarization Percentage');
    });
}

function buildXAxis(svg, xScale, margin, text) {
  const textMargin = 50;
  svg.append('g')
    .attr('class', 'xAxis')
    .attr('transform', `translate(${margin.left},${svg.attr('height') - margin.top - margin.bottom})`)
    .call(axisBottom(xScale))
    .attr('font-size', 30)
    .attr('font-family', 'Nunito')
    .append('text')
    .attr('x', (svg.attr('width') - margin.left - margin.right) / 2 + margin.left)
    .attr('y', margin.bottom + textMargin)
    .attr('fill', '#000')
    .attr('text-anchor', 'middle')
    .attr('font-size', '40')
    .attr('font-family', 'Nunito')
    .text(text);
}

function buildYAxis(svg, yScale, margin, text) {
  const textMargin = 80;
  svg.append('g')
    .attr('class', 'yAxis')
    .attr('transform', `translate(${2 * margin.left},${margin.top})`)
    .call(axisLeft(yScale))
    .attr('font-size', 30)
    .attr('font-family', 'Nunito')
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', margin.top - (svg.attr('height') - margin.bottom) / 1.9)
    .attr('y', svg.attr('x') - textMargin)
    .attr('fill', '#000')
    .attr('text-anchor', 'middle')
    .attr('font-size', '40')
    .attr('font-family', 'Nunito')
    .text(text);

  select('.xAxis').selectAll('.tick > line')
    .attr('y1', d => -1 * (svg.attr('height') - margin.top - margin.bottom - 50))
    .attr('stroke', 'grey')
    .attr('stroke-width', 0.8);

  select('.yAxis').selectAll('.tick > line')
    .attr('x1', (d, i) => (i > 13) ? 0 : svg.attr('width') - margin.right - margin.left)
    .attr('stroke', 'grey')
    .attr('stroke-width', 0.8);

  // remove every other tick label to reduce clutter
  selectAll('.tick')
    .attr('opacity', (d, i) => i % 2
    );
}
