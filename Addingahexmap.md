## So You Want to Add A Hex Map

In this document we will briefly outline a mechanism for inserting a hexmap into your d3 project. These hexagons are labeled with state abbreviations and can be colored according to a provided coloring function.

To begin with, we have d3-selection and d3-fetch installed. At the top of your file make sure you have imported AT LEAST these functions

```javascript
import {select} from 'd3-selection';
import {csv} from 'd3-fetch';
```

We also require that the positions of the hexaons be stored in a csv called './data/hexmap.csv'. The contents of the file are

```csv
StateAbbr,StateName,HexRow,HexCol
AL,Alabama,7,5
AK,Alaska,1,2
AZ,Arizona,7,1
AR,Arkansas,6,4
CA,California,6,0
CO,Colorado,5,2
CT,Connecticut,4,10
DE,Delaware,5,9
DC,District of Columbia,6,8
FL,Florida,8,5
GA,Georgia,7,6
HI,Hawaii,8,-1
ID,Idaho,4,1
IL,Illinois,4,5
IN,Indiana,4,6
IA,Iowa,4,4
KS,Kansas,6,3
KY,Kentucky,5,5
LA,Louisiana,7,3
ME,Maine,1,12
MD,Maryland,5,8
MA,Massachusetts,3,10
MI,Michigan,3,7
MN,Minnesota,3,4
MS,Mississippi,7,4
MO,Missouri,5,4
MT,Montana,3,2
NE,Nebraska,5,3
NV,Nevada,5,1
NH,New Hampshire,2,11
NJ,New Jersey,4,9
NM,New Mexico,6,2
NY,New York,3,9
NC,North Carolina,6,6
ND,North Dakota,3,3
OH,Ohio,4,7
OK,Oklahoma,7,2
OR,Oregon,5,0
PA,Pennsylvania,4,8
RI,Rhode Island,3,11
SC,South Carolina,6,7
SD,South Dakota,4,3
TN,Tennessee,6,5
TX,Texas,8,2
UT,Utah,6,1
VT,Vermont,2,10
VA,Virginia,5,7
WA,Washington,3,1
WV,West Virginia,5,6
WI,Wisconsin,3,5
WY,Wyoming,4,2
```
(Copy the contents of the lines in between the quotes into a file called hexmap.csv in the data folder.)

Next, add the following script somewhere in your project

```javascript
/**
 * Inject a hex map into a target graphic
 * @param {Object} svg - d3 selection for the hex map to be inserted into
 * @param {Function} colorScale - method for coloring each of the hex cells
 * @param {Number} width - the width of the the hexmap, this implies the height as well
 * this is because hexagons have a fixed aspect ratio.
 * @param {Number} translateX - the x offset of the hex map
 * @param {Number} translateX - the y offset of the hex map
 */
function buildHexMap(svg, colorScale, width, translateX, translateY) {
  // tunable (ie you can change them if you want) parameters for modifying the size of hexes
  const scaling = 1;
  const hexWidth = width / 11;

  // grab the the hexmap csv
  csv('./data/hexmap.csv')
    .then(data => {
      // build a wrapper to put the hexes in
      const hexWrapper = svg.append('g')
        .attr('class', 'hex-wrapper')
        .attr('transform', `translate(${translateX}, ${translateY})`);
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
            l${-dx},${dy} Z
            `;
          return constructedPath;
        })
        .attr('fill', d => colorScale(d));

      const fontSize = 20;
      hexContainers.append('text')
        .attr('class', 'state-hex-label')
        // tune label placement
        .attr('x', 0)
        .attr('y', fontSize / 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', fontSize)
        .text(d => d.StateAbbr);
    });
}
```


Finally, all you have to insert your super cool hex map is to call the above function. For instance you might do something like


```javascript
const svg = select('.vis-container').attr('width', width).attr('height', height);
buildHexMap(svg, () => 'red', 500, 200, 300);
```

And that's it! Happy choroplething.