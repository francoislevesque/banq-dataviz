class Chord {

    constructor() {

        let vm = this

        /*** Define parameters and tools ***/
        this.width = 1200
        this.height = 1200
        this.outerRadius = Math.min(this.width, this.height) / 2 - 120
        this.innerRadius = this.outerRadius - 35

        this.dateRange = [-10000,10000];
        this.artist = null;
        this.countries = {};
        this.uniques = {};
        this.maxCountries = 10;
        this.frequentArtists = {}

        //string url for the initial data set
        //would usually be a file path url, here it is the id
        //selector for the <pre> element storing the data

        //create number formatting functions
        this.formatPercent = d3.format("%");
        this.numberWithCommas = d3.format("f");

        //create the arc path data generator for the groups
        this.arc = d3.svg.arc()
            .innerRadius(this.innerRadius)
            .outerRadius(this.outerRadius);

        //create the chord path data generator for the chords
        this.path = d3.svg.chord()
            .radius(this.innerRadius - 4);// subtracted 4 to separate the ribbon

        this.last_layout; //store layout between updates
        this.regions; //store neighbourhood data outside data-reading function
        
        // Treat data 
        d3.csv("/data/data.csv", function(error, data) {
    
            for (var i = 0, len = data.length; i < len; i++) {
        
                let newRole = vm.getFirstValue(data[i]['Relation_Chanson_Autorite']);
                let id = data[i]['Id_Chanson']

                // Find frequent artists
                if (data[i]['Forme_Retenue_Autorite'] != "") {
                    if (vm.frequentArtists[data[i]['Forme_Retenue_Autorite']] == undefined) {
                        vm.frequentArtists[data[i]['Forme_Retenue_Autorite']] = {
                            artist: data[i]['Forme_Retenue_Autorite'],
                            count: 1
                        }
                    } else {
                        vm.frequentArtists[data[i]['Forme_Retenue_Autorite']].count++
                    }
                }
        
                if (vm.uniques[id] === undefined) { 
                    vm.uniques[id] = {
                        id: data[i]['Id_Chanson'],
                        parent_id: data[i]['Id_Chanson_Parent'],
                        has_parent: data[i]['Id_Chanson_Parent'] != "",
                        country_activity: vm.getFirstValue(data[i]['Lieux_Activites_Autorite']),
                        country_birth: vm.getFirstValue(data[i]['Lieux_Naissances_Autorite']),
                        country_origin: vm.getFirstValue(data[i]['Lieux_Activites_Autorite']),
                        countries_origin: {
                            [vm.getFirstValue(data[i]['Lieux_Activites_Autorite'])] : 1
                        },
                        autority_role: vm.getFirstValue(data[i]['Relation_Chanson_Autorite']),
                        year: data[i]['Annee_Creation_Chanson'],
                        artist: data[i]['Forme_Retenue_Autorite']
                    };
                } else {
                    vm.uniques[id].artist += (" " + data[i]['Forme_Retenue_Autorite'])
                    if (vm.getFirstValue(data[i]['Lieux_Activites_Autorite']) !==  "") {
                        vm.uniques[id].countries_origin[vm.getFirstValue(data[i]['Lieux_Activites_Autorite'])] = ++vm.uniques[id].countries_origin[vm.getFirstValue(data[i]['Lieux_Activites_Autorite'])] || 1
                        vm.uniques[id].country_origin = Object.keys(vm.uniques[id].countries_origin).reduce((a, b) => vm.uniques[id].countries_origin[a] > vm.uniques[id].countries_origin[b] ? a : b);
                    }
                }
            }

            vm.frequentArtists = Object.values(vm.frequentArtists).sort((a,b) => {
                return b.count - a.count;
            }).slice(0, 10)

            /*** Initialize the visualization ***/
            vm.g = d3.select("#chart_placeholder").append("svg")
            .attr("width", vm.width)
            .attr("height", vm.height)
            .append("g")
            .attr("id", "circle")
            .attr("transform", 
                "translate(" + vm.width / 2 + "," + vm.height / 2 + ")");

            //the entire graphic will be drawn within this <g> element,
            //so all coordinates will be relative to the center of the circle

            vm.g.append("circle")
            .attr("r", vm.outerRadius);

            vm.countries = vm.mapCountries(vm.uniques);
        
            vm.regions = Object.values(vm.countries).map(c => {
                return {
                    name: c.country,
                    color: c.color
                }
            });
            
            vm.updateChords(); 
        });
    }

    calculateMatrix(songs) {
        let matrix = [];

        for (let i = 0; i < Object.keys(this.countries).length; i++) {
            matrix.push([]);
            for (let j = 0; j < Object.keys(this.countries).length; j++) {
                matrix[i][j] = 0;
            }
        }

        let vm = this

        Object.values(songs).forEach(s => {
            if (
                s.parent_id != "" &&
                s.country_origin !== undefined &&
                s.country_origin != "" &&
                s.year >= this.dateRange[0] &&
                s.year <= this.dateRange[1] &&
                (this.artist === null || s.artist.includes(this.artist))
            ) {
                let otherCountry = this.countries["Autres"].key;
                
                let destinationCountryText = s.country_origin;
                let destinationCountry = (destinationCountryText != "" && this.countries[destinationCountryText]) ? this.countries[destinationCountryText].key : otherCountry;

                let parentSong = this.uniques[s.parent_id];
                let parentCountryText = parentSong.country_origin;
                let originCountry = (parentCountryText != "" && this.countries[parentCountryText]) ? this.countries[parentCountryText].key : otherCountry;

                matrix[originCountry][destinationCountry]++;
            }
        });

        return matrix;
    }

    mapCountries(songs) {
        
        var countries = {};
        var colors =  ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
        Object.values(songs).forEach(d => {
            let songCountry = d.country_origin;
            if (songCountry !== undefined && songCountry != "") {
                let country = countries[songCountry];
                countries[songCountry] = {
                    count: (country === undefined) ? 1 : +country.count + 1,
                    country: songCountry
                }
            }
        });

        countries = Object.values(countries);
        
        // Sort by song frequency
        countries.sort((a, b) => {
            return b.count - a.count;
        });
        
        // Slice the top countries
        if (countries.length > this.maxCountries) {
            countries = countries.slice(0, this.maxCountries);
        }

        countries.push({
            count: 0,
            country: 'Autres'
        })
        
        // Create a lookup object
        var lookup = {};

        countries.forEach((c, i) => {
            lookup[c.country] = {
                key: i,
                color: colors[i],
                country: c.country
            };
        });

        return lookup;
    }

    getFirstValue(value) {
        return value.split(';')[0];
    }

    //define the default chord layout parameters
    //within a function that returns a new layout object;
    //that way, you can create multiple chord layouts
    //that are the same except for the data.
    getDefaultLayout() {
        return d3.layout.chord()
        .padding(0.03)
        .sortSubgroups(d3.descending)
        .sortChords(d3.ascending);
    }

    /* Create OR update a chord layout from a data matrix */
    updateChords() {

        let vm = this;

        let activeSongs = {}

        // Filter songs
        Object.values(this.uniques).forEach(s => {
            if (
                s.parent_id != "" &&
                s.country_origin !== undefined &&
                s.country_origin != "" &&
                s.year >= this.dateRange[0] &&
                s.year <= this.dateRange[1] &&
                (this.artist === null || s.artist.includes(this.artist))
            ) {
                activeSongs[s.id] = s
            }
        });
        
        let matrix = this.calculateMatrix(activeSongs);

        let isEmpty = true
        for(let i = 0; i < this.maxCountries && isEmpty; i++) {
            for(let j = 0; j < this.maxCountries && isEmpty; j++) {
                if (matrix[i][j] > 0) {
                    isEmpty = false;
                }
            }
        }

        if (isEmpty) {
            return false;
        }
        
        /* Compute chord layout. */
        this.layout = this.getDefaultLayout(); //create a new layout object
        this.layout.matrix(matrix);
    
        /* Create/update "group" elements */
        var groupG = this.g.selectAll("g.group")
            .data(this.layout.groups(), function (d) {
                return d.index; 
                //use a key function in case the 
                //groups are sorted differently 
            });
        
        groupG.exit()
            .transition()
                .duration(500)
                .attr("opacity", 0)
                .remove(); //remove after transitions are complete
        
        var newGroups = groupG.enter().append("g")
            .attr("class", "group");
        //the enter selection is stored in a variable so we can
        //enter the <path>, <text>, and <title> elements as well

        
        //Create the title tooltip for the new groups
        newGroups.append("title");
        
        //Update the (tooltip) title text based on the data
        groupG.select("title")
            .text((d, i) => {
                return this.numberWithCommas(d.value) 
                    + " chansons venant de " 
                    + this.regions[i].name;
            });

        //create the arc paths and set the constant attributes
        //(those based on the group index, not on the value)
        newGroups.append("path")
            .attr("id", (d) => {
                return "group" + d.index;
                //using d.index and not i to maintain consistency
                //even if groups are sorted
            })
            .style("fill", (d) => {
                return this.regions[d.index].color;
            });
        
        //update the paths to match the layout
        groupG.select("path") 
            .transition()
                .duration(500)
                //.attr("opacity", 0.5) //optional, just to observe the transition////////////
                .attrTween("d", this.arcTween( this.last_layout ))
            // .transition().duration(100).attr("opacity", 1) //reset opacity//////////////
            ;
        
        //create the group labels
        newGroups.append("svg:text")
            .attr("xlink:href", function (d) {
                return "#group" + d.index;
            })
            .attr("dy", "0.3em")
            .attr("transform", function(d) {
                d.angle = (d.startAngle + d.endAngle) / 2;
                //store the midpoint angle in the data object
                
                return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
                    " translate(" + (vm.outerRadius - 100) + ")" + 
                    (d.angle > Math.PI ? " rotate(180)" : " rotate(0)"); 
                //include the rotate zero so that transforms can be interpolated
            })
            .attr("opacity", "0")
            .text(function (d) {
                return vm.regions[d.index].name; 
            })
            .attr("text-anchor", function (d) {
                return d.angle > Math.PI ? "end" : "begin";
            });

        //position group labels to match layout
        groupG.select("text")
            .transition()
                .duration(100)
                .attr("opacity", "1")
                .attr("transform", function(d) {
                    d.angle = (d.startAngle + d.endAngle) / 2;
                    //store the midpoint angle in the data object
                    
                    return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
                        " translate(" + (vm.outerRadius + 6) + ")" + 
                        (d.angle > Math.PI ? " rotate(180)" : " rotate(0)"); 
                    //include the rotate zero so that transforms can be interpolated
                })
                .attr("text-anchor", function (d) {
                    return d.angle > Math.PI ? "end" : "begin";
                });
        
        
        /* Create/update the chord paths */
        var chordPaths = this.g.selectAll("path.chord")
            .data(vm.layout.chords(), vm.chordKey );
                //specify a key function to match chords
                //between updates
            
        
        //create the new chord paths
        var newChords = chordPaths.enter()
            .append("path")
            .attr("class", "chord");
        
        // Add title tooltip for each new chord.
        newChords.append("title");
        
        // Update all chord title texts
        chordPaths.select("title")
            .text(function(d) {
                if (vm.regions[d.target.index].name !== vm.regions[d.source.index].name) {
                    return [vm.numberWithCommas(d.source.value),
                            " adaptations de ",
                            vm.regions[d.source.index].name,
                            " à ",
                            vm.regions[d.target.index].name,
                            "\n",
                            vm.numberWithCommas(d.target.value),
                            " adaptations de ",
                            vm.regions[d.target.index].name,
                            " à ",
                            vm.regions[d.source.index].name
                            ].join(""); 
                        //joining an array of many strings is faster than
                        //repeated calls to the '+' operator, 
                        //and makes for neater code!
                } 
                else { //source and target are the same
                    return vm.numberWithCommas(d.source.value) 
                        + " adaptations restées à " 
                        + vm.regions[d.source.index].name;
                }
            });

        //handle exiting paths:
        chordPaths.exit().transition()
            .duration(500)
            .attr("opacity", 0)
            .remove();

        //update the path shape
        chordPaths.transition()
            .duration(500)
            //.attr("opacity", 0.5) //optional, just to observe the transition
            .style("fill", function (d) {
                return vm.regions[d.source.index].color;
            })
            .attrTween("d", vm.chordTween(vm.last_layout))
            //.transition().duration(100).attr("opacity", 1) //reset opacity
        ;

        //add the mouseover/fade out behaviour to the groups
        //this is reset on every update, so it will use the latest
        //chordPaths selection
        groupG.on("mouseover", function(d) {
            chordPaths.classed("fade", function (p) {
                //returns true if *neither* the source or target of the chord
                //matches the group that has been moused-over
                return ((p.source.index != d.index) && (p.target.index != d.index));
            });
        });
        //the "unfade" is handled with CSS :hover class on g#circle
        //you could also do it using a mouseout event:
        
        groupG.on("mouseout", function() {
            if (vm == vm.g.node() )
                //only respond to mouseout of the entire circle
                //not mouseout events for sub-components
                chordPaths.classed("fade", false);
        });
        
        
        this.last_layout = this.layout; //save for next update

        return true
    
    }

    arcTween(oldLayout) {

        var vm = this;
        //this function will be called once per update cycle
        
        //Create a key:value version of the old layout's groups array
        //so we can easily find the matching group 
        //even if the group index values don't match the array index
        //(because of sorting)
        var oldGroups = {};
        if (oldLayout) {
            oldLayout.groups().forEach( function(groupData) {
                oldGroups[ groupData.index ] = groupData;
            });
        }
        
        return function (d, i) {
            var tween;
            var old = oldGroups[d.index];
            if (old) { //there's a matching old group
                tween = d3.interpolate(old, d);
            }
            else {
                //create a zero-width arc object
                var emptyArc = {startAngle:d.startAngle,
                                endAngle:d.startAngle};
                tween = d3.interpolate(emptyArc, d);
            }
            
            return function (t) {
                return vm.arc( tween(t) );
            };
        };
    }

    chordKey(data) {
        return (data.source.index < data.target.index) ?
            data.source.index  + "-" + data.target.index:
            data.target.index  + "-" + data.source.index;
        
        //create a key that will represent the relationship
        //between these two groups *regardless*
        //of which group is called 'source' and which 'target'
    }

    chordTween(oldLayout) {
        //this function will be called once per update cycle
        
        //Create a key:value version of the old layout's chords array
        //so we can easily find the matching chord 
        //(which may not have a matching index)
        
        var oldChords = {};
        var vm = this;
        
        if (oldLayout) {
            oldLayout.chords().forEach( function(chordData) {
                oldChords[ vm.chordKey(chordData) ] = chordData;
            });
        }
        
        return function (d, i) {
            //this function will be called for each active chord
            
            var tween;
            var old = oldChords[ vm.chordKey(d) ];
            if (old) {
                //old is not undefined, i.e.
                //there is a matching old chord value
                
                //check whether source and target have been switched:
                if (d.source.index != old.source.index ){
                    //swap source and target to match the new data
                    old = {
                        source: old.target,
                        target: old.source
                    };
                }
                
                tween = d3.interpolate(old, d);
            }
            else {
                //create a zero-width chord object
    ///////////////////////////////////////////////////////////in the copy ////////////////            
                if (oldLayout) {
                    var oldGroups = oldLayout.groups().filter(function(group) {
                            return ( (group.index == d.source.index) ||
                                    (group.index == d.target.index) )
                        });
                    old = {source:oldGroups[0],
                            target:oldGroups[1] || oldGroups[0] };
                        //the OR in target is in case source and target are equal
                        //in the data, in which case only one group will pass the
                        //filter function
                    
                    if (d.source.index != old.source.index ){
                        //swap source and target to match the new data
                        old = {
                            source: old.target,
                            target: old.source
                        };
                    }
                }
                else old = d;
    /////////////////////////////////////////////////////////////////               
                var emptyChord = {
                    source: { startAngle: old.source.startAngle,
                            endAngle: old.source.startAngle},
                    target: { startAngle: old.target.startAngle,
                            endAngle: old.target.startAngle}
                };
                tween = d3.interpolate( emptyChord, d );
            }

            return function (t) {
                //this function calculates the intermediary shapes
                return vm.path(tween(t));
            };
        };
    }
}

var app = new Vue({
    el: '#app',
    data() {
        return {
            chord: null
        }
    },
    mounted() {
        this.chord = new Chord()
    },
    methods: {
        dates() {
            let dates = [{
                label: 'Tout',
                value: [-10000, 10000]
            }]
            for (let i = 1900; i < 2010; i += 10) {
                dates.push({
                    label: `${i}-${i+10}`,
                    value: [i, i+10]
                })
            }
            return dates
        },
        artists() {
            return [
                {label: 'Tous les artistes', value: null},
                {label: 'Beatles', value: 'Beatles'},
                {label: 'Elvis Presley', value: 'Presley, Elvis'},
                {label: 'Charles Aznavour', value: 'Aznavour, Charles'},
                {label: 'Nana Mouskouri', value: 'Mouskouri, Nana'},
                {label: 'Johnny Hallyday', value: 'Hallyday, Johnny'},
                {label: 'Eddy Marnay', value: 'Marnay, Eddy'},
                {label: 'Sylvie Vartan', value: 'Vartan, Sylvie'},
                {label: 'Gilles Brown', value: 'Brown, Gilles'},
                {label: 'Dalida', value: 'Dalida'},
            ]
        },
        updateDate(dateRange) {
            let lastSelection = this.chord.dateRange
            this.chord.dateRange = dateRange
            if (!this.chord.updateChords()) {
                this.chord.dateRange = lastSelection
                this.chord.updateChords()
            }
        },
        updateArtist(artist) {
            let lastSelection = this.chord.artist
            this.chord.artist = artist
            if (!this.chord.updateChords()) {
                this.chord.artist = lastSelection
                this.chord.updateChords()
            }
        }
    }
})
