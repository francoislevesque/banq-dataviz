class Keyword {

  initialize([data, locale]) {
  
    d3.timeFormatDefaultLocale(locale)
  
    data = data.map(i => {
      return {
        word: i.word,
        frequency: parseInt(i.frequence),
        style: Math.round((Math.random() * 2 - 1) * 1000) / 1000
      }
    })
    
    let dataset = {}
  
    // Divide into categories
    for (let i = 0; i < data.length; i++) {
      let item = data[i]
      let category = Math.floor(item.style * 10)
      
      if (dataset[category] === undefined) {
        dataset[category] = []
      }
  
      dataset[category].push(item)
    }
  
    for (let i in dataset) {
      // Sort dataset
      dataset[i].sort((a, b) => b.frequency - a.frequency)
      // Keep first 20
      //dataset[i] = dataset[i].slice(0,10)
      // Order
      let orderedItems = []
      dataset[i].forEach((d, index) => {
        if (index % 2) {
          orderedItems.push(d)
        } else {
          orderedItems.unshift(d)
        }
        
        dataset[i] = orderedItems
      })
    }
  
    this.margin = {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10
    }
  
    this.width = 1920 - this.margin.left - this.margin.right
    this.height = 700
    
    this.tile = {
      padding: {
        x: 1,
        y: 5
      },
      height: 20
    }
  
    this.rangeX = [2,200]
  
    this.scaleX = d3.scaleLinear()
      .domain(d3.extent(data, d => d.frequency))
      .range(this.rangeX)
      .nice()
    
    this.rangeY = [0,20]
  
    this.scaleY = d3.scaleLinear()
    .domain(d3.extent(Object.keys(dataset).map(d => parseInt(d))))
    .range(this.rangeY)
    .nice()
    
    this.scaleYColor = d3.scaleSequential(d3.interpolateRdBu)
      .domain(d3.extent(data, d => d.style))
  
    this.svg = d3.select('body')
      .append('svg')
      .attr('class', 'keyword')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
  
    const g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
  
    for (let i in dataset) {
      const line = g.append('g')
      .attr('transform', `translate(${this.width / 2 - this.lineWidth(dataset[i])/2}, ${(this.tile.padding.y + this.tile.height) * this.scaleY(i)})`)
  
      line.selectAll('rect')
        .data(dataset[i])
        .enter()
        .append('rect')
        .attr("class", "box")
        .attr("x", (d,j,items) => Math.floor(dataset[i].slice(0,j).reduce((t,d) => t += this.scaleX(d.frequency) + this.tile.padding.x, 0)))
        .attr("y", 0)
        .attr("height", this.tile.height)
        .attr("width", d => Math.floor(this.scaleX(d.frequency)))
        .style("fill", d => this.scaleYColor(d.style))
  
      line.append('g').selectAll('text')
        .data(dataset[i])
        .enter()
        .append('text')
        .attr("class", d => (Math.abs(d.style) < 0.6) ? "is-normal" : "is-white")
        .attr('dominant-baseline', 'central')
        .attr('text-anchor', 'middle')
        .attr("x", (d,j,items) => Math.floor(this.lineWidth(dataset[i], j) + this.scaleX(dataset[i][j].frequency) / 2))
        .attr("y", this.tile.height / 2)
        .text(d => d.word)
        .style("visibility", (d,i,n) => (n[i].getComputedTextLength() < this.scaleX(d.frequency)) ? 'visible' : 'hidden')
    }
  
    g.append('line')
    .attr('x1', 0)
    .attr('y1', this.scaleY(0) * (this.tile.height + this.tile.padding.y) - this.tile.padding.y/2)
    .attr('x2', this.width)
    .attr('y2', this.scaleY(0) * (this.tile.height + this.tile.padding.y) - this.tile.padding.y/2)
    .attr('height', 1)
    .style('stroke-width', 1)
    .style('stroke', "e1e1e1")
    .style('stroke-dasharray', 4)
  }

  lineWidth(data, max = null) {
    if (max == null) {
      max = data.length - 1
    }
  
    return Math.floor(data.slice(0,max).reduce((t,d) => t += this.scaleX(d.frequency) + this.tile.padding.x, 0))
  }

}

Promise.all([
  d3.csv('./data/words.csv'),
  d3.json('./data/fr-CA.json')
]).then(initialize)

function initialize(data) {
  (new Keyword()).initialize(data)
}