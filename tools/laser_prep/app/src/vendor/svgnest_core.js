/*!
 * SVGnest genetic algorithm and no-fit-polygon pair evaluation, extracted from svgnest.js
 * Copyright 2015 Jack Qiao, MIT license (see LICENSE_SVGNEST_MIT.txt)
 * Adapted for the laser prep app: the Parallel.js worker plumbing is removed and the two pieces are
 * exposed as SvgNestCore.GeneticAlgorithm and SvgNestCore.nfpPair. The algorithm code is unchanged.
 */
(function(root){
	'use strict';

	function nfpPair(pair, searchEdges, useHoles){

				if(!pair || pair.length == 0){
					return null;
				}
				
				
				
				var A = rotatePolygon(pair.A, pair.key.Arotation);
				var B = rotatePolygon(pair.B, pair.key.Brotation);

				var nfp;
				
				if(pair.key.inside){
					if(GeometryUtil.isRectangle(A, 0.001)){
						nfp = GeometryUtil.noFitPolygonRectangle(A,B);
					}
					else{
						nfp = GeometryUtil.noFitPolygon(A,B,true,searchEdges);
					}
					
					// ensure all interior NFPs have the same winding direction
					if(nfp && nfp.length > 0){
						for(var i=0; i<nfp.length; i++){
							if(GeometryUtil.polygonArea(nfp[i]) > 0){
								nfp[i].reverse();
							}
						}
					}
					else{
						// warning on null inner NFP
						// this is not an error, as the part may simply be larger than the bin or otherwise unplaceable due to geometry
						log('NFP Warning: ', pair.key);
					}
				}
				else{
					if(searchEdges){
						nfp = GeometryUtil.noFitPolygon(A,B,false,searchEdges);
					}
					else{
						nfp = minkowskiDifference(A,B);
					}
					// sanity check
					if(!nfp || nfp.length == 0){
						log('NFP Error: ', pair.key);
						log('A: ',JSON.stringify(A));
						log('B: ',JSON.stringify(B));
						return null;
					}
					
					for(var i=0; i<nfp.length; i++){
						if(!searchEdges || i==0){ // if searchedges is active, only the first NFP is guaranteed to pass sanity check
							if(Math.abs(GeometryUtil.polygonArea(nfp[i])) < Math.abs(GeometryUtil.polygonArea(A))){
								log('NFP Area Error: ', Math.abs(GeometryUtil.polygonArea(nfp[i])), pair.key);
								log('NFP:', JSON.stringify(nfp[i]));
								log('A: ',JSON.stringify(A));
								log('B: ',JSON.stringify(B));
								nfp.splice(i,1);
								return null;
							}
						}
					}
					
					if(nfp.length == 0){
						return null;
					}
					
					// for outer NFPs, the first is guaranteed to be the largest. Any subsequent NFPs that lie inside the first are holes
					for(var i=0; i<nfp.length; i++){
						if(GeometryUtil.polygonArea(nfp[i]) > 0){
							nfp[i].reverse();
						}
						
						if(i > 0){
							if(GeometryUtil.pointInPolygon(nfp[i][0], nfp[0])){
								if(GeometryUtil.polygonArea(nfp[i]) < 0){
									nfp[i].reverse();
								}
							}
						}
					}
					
					// generate nfps for children (holes of parts) if any exist
					if(useHoles && A.childNodes && A.childNodes.length > 0){
						var Bbounds = GeometryUtil.getPolygonBounds(B);
						
						for(var i=0; i<A.childNodes.length; i++){
							var Abounds = GeometryUtil.getPolygonBounds(A.childNodes[i]);

							// no need to find nfp if B's bounding box is too big
							if(Abounds.width > Bbounds.width && Abounds.height > Bbounds.height){
							
								var cnfp = GeometryUtil.noFitPolygon(A.childNodes[i],B,true,searchEdges);
								// ensure all interior NFPs have the same winding direction
								if(cnfp && cnfp.length > 0){
									for(var j=0; j<cnfp.length; j++){
										if(GeometryUtil.polygonArea(cnfp[j]) < 0){
											cnfp[j].reverse();
										}
										nfp.push(cnfp[j]);
									}
								}
							
							}
						}
					}
				}
				
				function log(){
					if(typeof console !== "undefined") {
						console.log.apply(console,arguments);
					}
				}
				
				function toClipperCoordinates(polygon){
					var clone = [];
					for(var i=0; i<polygon.length; i++){
						clone.push({
							X: polygon[i].x,
							Y: polygon[i].y
						});
					}
	
					return clone;
				};
				
				function toNestCoordinates(polygon, scale){
					var clone = [];
					for(var i=0; i<polygon.length; i++){
						clone.push({
							x: polygon[i].X/scale,
							y: polygon[i].Y/scale
						});
					}
	
					return clone;
				};
				
				function minkowskiDifference(A, B){
					var Ac = toClipperCoordinates(A);
					ClipperLib.JS.ScaleUpPath(Ac, 10000000);
					var Bc = toClipperCoordinates(B);
					ClipperLib.JS.ScaleUpPath(Bc, 10000000);
					for(var i=0; i<Bc.length; i++){
						Bc[i].X *= -1;
						Bc[i].Y *= -1;
					}
					var solution = ClipperLib.Clipper.MinkowskiSum(Ac, Bc, true);
					var clipperNfp;
		
					var largestArea = null;
					for(i=0; i<solution.length; i++){
						var n = toNestCoordinates(solution[i], 10000000);
						var sarea = GeometryUtil.polygonArea(n);
						if(largestArea === null || largestArea > sarea){
							clipperNfp = n;
							largestArea = sarea;
						}
					}
		
					for(var i=0; i<clipperNfp.length; i++){
						clipperNfp[i].x += B[0].x;
						clipperNfp[i].y += B[0].y;
					}
		
					return [clipperNfp];
				}
				
				return {key: pair.key, value: nfp};
			
	}

	function GeneticAlgorithm(adam, bin, config){
	
		this.config = config || { populationSize: 10, mutationRate: 10, rotations: 4 };
		this.binBounds = GeometryUtil.getPolygonBounds(bin);
		
		// population is an array of individuals. Each individual is a object representing the order of insertion and the angle each part is rotated
		var angles = [];
		for(var i=0; i<adam.length; i++){
			angles.push(this.randomAngle(adam[i]));
		}
		
		this.population = [{placement: adam, rotation: angles}];
		
		while(this.population.length < config.populationSize){
			var mutant = this.mutate(this.population[0]);
			this.population.push(mutant);
		}
	}
	
	// returns a random angle of insertion
	GeneticAlgorithm.prototype.randomAngle = function(part){
		
		var angleList = [];
		for(var i=0; i<Math.max(this.config.rotations,1); i++){
			angleList.push(i*(360/this.config.rotations));
		}
		
		function shuffleArray(array) {
			for (var i = array.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = array[i];
				array[i] = array[j];
				array[j] = temp;
			}
			return array;
		}
		
		angleList = shuffleArray(angleList);

		for(i=0; i<angleList.length; i++){
			var rotatedPart = GeometryUtil.rotatePolygon(part, angleList[i]);
			
			// don't use obviously bad angles where the part doesn't fit in the bin
			if(rotatedPart.width < this.binBounds.width && rotatedPart.height < this.binBounds.height){
				return angleList[i];
			}
		}
		
		return 0;
	}
	
	// returns a mutated individual with the given mutation rate
	GeneticAlgorithm.prototype.mutate = function(individual){
		var clone = {placement: individual.placement.slice(0), rotation: individual.rotation.slice(0)};
		for(var i=0; i<clone.placement.length; i++){
			var rand = Math.random();
			if(rand < 0.01*this.config.mutationRate){
				// swap current part with next part
				var j = i+1;
				
				if(j < clone.placement.length){
					var temp = clone.placement[i];
					clone.placement[i] = clone.placement[j];
					clone.placement[j] = temp;
				}
			}
			
			rand = Math.random();
			if(rand < 0.01*this.config.mutationRate){
				clone.rotation[i] = this.randomAngle(clone.placement[i]);
			}
		}
		
		return clone;
	}
	
	// single point crossover
	GeneticAlgorithm.prototype.mate = function(male, female){
		var cutpoint = Math.round(Math.min(Math.max(Math.random(), 0.1), 0.9)*(male.placement.length-1));
		
		var gene1 = male.placement.slice(0,cutpoint);
		var rot1 = male.rotation.slice(0,cutpoint);
		
		var gene2 = female.placement.slice(0,cutpoint);
		var rot2 = female.rotation.slice(0,cutpoint);
		
		var i;
		
		for(i=0; i<female.placement.length; i++){
			if(!contains(gene1, female.placement[i].id)){
				gene1.push(female.placement[i]);
				rot1.push(female.rotation[i]);
			}
		}
		
		for(i=0; i<male.placement.length; i++){
			if(!contains(gene2, male.placement[i].id)){
				gene2.push(male.placement[i]);
				rot2.push(male.rotation[i]);
			}
		}
		
		function contains(gene, id){
			for(var i=0; i<gene.length; i++){
				if(gene[i].id == id){
					return true;
				}
			}
			return false;
		}
		
		return [{placement: gene1, rotation: rot1},{placement: gene2, rotation: rot2}];
	}

	GeneticAlgorithm.prototype.generation = function(){
				
		// Individuals with higher fitness are more likely to be selected for mating
		this.population.sort(function(a, b){
			return a.fitness - b.fitness;
		});
		
		// fittest individual is preserved in the new generation (elitism)
		var newpopulation = [this.population[0]];
		
		while(newpopulation.length < this.population.length){
			var male = this.randomWeightedIndividual();
			var female = this.randomWeightedIndividual(male);
			
			// each mating produces two children
			var children = this.mate(male, female);
			
			// slightly mutate children
			newpopulation.push(this.mutate(children[0]));
				
			if(newpopulation.length < this.population.length){
				newpopulation.push(this.mutate(children[1]));
			}
		}
				
		this.population = newpopulation;
	}
	
	// returns a random individual from the population, weighted to the front of the list (lower fitness value is more likely to be selected)
	GeneticAlgorithm.prototype.randomWeightedIndividual = function(exclude){
		var pop = this.population.slice(0);
		
		if(exclude && pop.indexOf(exclude) >= 0){
			pop.splice(pop.indexOf(exclude),1);
		}
		
		var rand = Math.random();
		
		var lower = 0;
		var weight = 1/pop.length;
		var upper = weight;
		
		for(var i=0; i<pop.length; i++){
			// if the random number falls between lower and upper bounds, select this individual
			if(rand > lower && rand < upper){
				return pop[i];
			}
			lower = upper;
			upper += 2*weight * ((pop.length-i)/pop.length);
		}
		
		return pop[0];
	}
	

	root.SvgNestCore = { GeneticAlgorithm: GeneticAlgorithm, nfpPair: nfpPair };
})(typeof window !== 'undefined' ? window : self);
