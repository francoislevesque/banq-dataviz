Promise.all([
  d3.csv('./data/data.csv'),
  d3.json('./data/fr-CA.json')
]).then(initialize);

/**
 * Initialize
 *
 * @param data      Données à utiliser
 * @param locale    Les paramètres locaux à utiliser
 */
function initialize([data, locale]) {
  
  d3.timeFormatDefaultLocale(locale);

  var dataUniqueSongs = {};

  for (var i = 0, len = data.length; i < len; i++)
  dataUniqueSongs[data[i]['Id_Chanson']] = data[i];

  let uniques = new Array();
  for (var key in dataUniqueSongs)
  uniques.push(dataUniqueSongs[key]);

  buildTree(uniques);

  rolesGraph(data);

  makeAggregateGraphs(uniques);
}

function rolesGraph(data) {

  let aggregate = {};
    
  Object.values(data).forEach(d => {
    if (d['Relation_Chanson_Autorite'] !== undefined) {
      let text = d['Relation_Chanson_Autorite'].split(';')[0];
      if (text != "") {
        aggregate[text] = {
          count: (aggregate[text] === undefined) ? 1 : +aggregate[text].count + 1,
          label: text
        }
      }
    }
  });

  aggregate = Object.values(aggregate);

  aggregate.sort((a, b) => {
    return b.count - a.count;
  });

  makeBandGraph(aggregate, "Roles");
}

function buildTree(data) {

  let roots = {};

  data.forEach(d => {
    if (d.Id_Chanson_Parent == "") {
      roots[d.Id_Chanson] = d;
    }
  });

  let adapations = {};

  data.forEach(d => {
    if (d.Id_Chanson_Parent != "") {
      adapations[d.Id_Chanson] = d;
    }
  });

  childrenStats = [
    Object.keys(roots).length
  ];

  childrenStats = linkAdaptations(roots, adapations, childrenStats, 1);

  // Configuration
  const margin = {
    top: 60,
    right: 10,
    bottom: 10,
    left: 10
  };

  const width = 200 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select('body')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);
    
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  
  g.selectAll('text')
    .data(childrenStats)
    .enter()
    .append('text')
    .text((d, i) => `Niveau ${i}: ${d}`)
    .attr("y", (d, i) => 8 + i * 25)
    .attr("x", 20);

  g.append('text')
    .text(`Total: ${data.length}`)
    .attr("y", (d, i) => 8 + childrenStats.length * 25)
    .attr("x", 20);

  svg.append('g')
    .append('text')
    .text("Niveaux de nesting")
    .attr('class', 'title')
    .attr('dominant-baseline', 'hanging')
    .attr('x', 30)
    .attr('y', 4);
}

function linkAdaptations(roots, adaptations, childrenStats, deepness) {
  let newAdaptations = {};
  let newRoots = {};

  for (let i in adaptations) {
    let a = adaptations[i];
    let parent = roots[a.Id_Chanson_Parent];
    
    if (parent == undefined) {
      newAdaptations[a.Id_Chanson] = a;
    } else {
      if (childrenStats[deepness] === undefined) {
        childrenStats[deepness] = 0;
      }
      childrenStats[deepness]++;  
      if (parent.adapations === undefined) {
        roots[a.Id_Chanson_Parent].adapations = [];
      }
      roots[a.Id_Chanson_Parent].adapations.push(a);
      newRoots[a.Id_Chanson] = a;
    }
  }

  deepness++;

  if (Object.keys(newAdaptations).length == 0 || deepness == 10) {
    return childrenStats;
  }

  return linkAdaptations(newRoots, newAdaptations, childrenStats, deepness);
}

function makeAggregateGraphs(data) {
  var stats = {};

  let aggregatesAttributes = [
    'Type_Autorite',
    'Lieux_Naissances_Autorite',
    'Lieux_Activites_Autorite',
    'Annee_Creation_Chanson',
    'Langues_Chanson'
  ];

  aggregatesAttributes.forEach(a => {

    stats[a] = {};
    
    data.forEach(d => {
      if (d[a] !== undefined) {
        let text = d[a].split(';')[0];
        if (text != "") {
          stats[a][text] = {
            count: (stats[a][text] === undefined) ? 1 : +stats[a][text].count + 1,
            label: text
          }
        }
      }
    });

    stats[a] = Object.values(stats[a]);

  });

  stats['Lieux_Activites_Autorite'].sort((a, b) => {
    return b.count - a.count;
  });

  stats['Lieux_Naissances_Autorite'].sort((a, b) => {
    return b.count - a.count;
  });

  stats['Langues_Chanson'].sort((a, b) => {
    return b.count - a.count;
  });

  stats['Annee_Creation_Chanson'].sort((a, b) => {
    return a.label - b.label;
  });

  aggregatesAttributes.forEach(a => {
    makeBandGraph(stats[a], a);
  });
}

function makeBandGraph(dataset, title) {

  //dataset = dataset.slice(0, 10);
  // Configuration
  const margin = {
    top: 60,
    right: 50,
    bottom: 10,
    left: 140
  };

  const fullWidth = 500;
  const fullHeight = dataset.length;

  const width = fullWidth - margin.left - margin.right;
  const height = fullHeight * 25;

  const x = d3.scaleLinear()
    .domain([0, d3.max(dataset, c => c.count)])
    .range([0, width])

  const y = d3.scaleBand()
    .domain(dataset.map(d => d.label))
    .range([0, height])
    .paddingInner([0.1]);

  const xAxis = d3.axisTop(x).ticks(5);
  const yAxis = d3.axisLeft(y);

  const svg = d3.select('body')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  g.selectAll('rect.bar')
    .data(dataset)
    .enter()
    .append('rect')
    .attr("class", "bar")
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.count))
    .attr("x", 0)
    .attr("y", d => y(d.label));

  g.selectAll('text')
    .data(dataset)
    .enter()
    .append('text')
    .attr("class", "text")
    .text(d => d.count)
    .attr('dominant-baseline', 'central')
    .attr("x", d => 4 + x(d.count))
    .attr("y", d => y.bandwidth() / 2 + y(d.label));

  g.append('g')
    .attr('class', 'x axis')
    .call(xAxis);

  g.append('g')
    .attr('class', 'y axis')
    .call(yAxis);

  svg.append('g')
    .append('text')
    .text(title)
    .attr('class', 'title')
    .attr('dominant-baseline', 'hanging')
    .attr('x', margin.left)
    .attr('y', 4);
}