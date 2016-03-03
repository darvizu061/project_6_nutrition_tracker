// ajax prefilter for easier ajax calls 
// $.ajaxPrefilter(function( options, originalOptions, jqXHR){
//     options.url = 'https://api.nutritionix.com/v1_1/search/' + options.url;
// });
var FoodAttributes = Backbone.Model.extend({
    defaults: {
        item_name: "",
        brand_name: "",
        nf_serving_size_qty: null,
        nf_calories: null
    }
});

var GetFoodObjects = Backbone.Collection.extend({
    initialize: function(models, options){
        this.id = options.id;
    },
    url: function(){
        return 'https://api.nutritionix.com/v1_1/search/' + this.id+'?results=0:20&fields=item_name,brand_name,nf_serving_size_qty,nf_calories&appId=8413e82a&appKey=0142fcf7e19fb339a900d4b1d05135ae';
    },
    parse: function(response) {
        return response.hits;
    }
});
var HoldFoodEntries = Backbone.Collection.extend({
    model: FoodAttributes
});
var HoldSearchResults = Backbone.Collection.extend({
    model: FoodAttributes
});

var ButtonDisplay = Backbone.View.extend({
    
    el: '#actionsList',
    events: {
        'click button#newEntry': 'renderSearchBox',
    },
    renderSearchBox: function(){
        $('#newEntryCSS').removeClass('hidden');
    }
});

var NewEntryControl = Backbone.View.extend({
    el: '#newEntryCSS',
    events: {
        'click .actionButtonBackground': 'hideSearchBox',
        'submit #searchFood': 'hideSearchBox'
    },
    hideSearchBox: function(e){
        getFoodSearchResult.getEntryInput(e);
        $('#newEntryCSS').addClass('hidden');
    }
    
});
var GetFoodSearchResult = Backbone.View.extend({
    getSearchInput: function(e){
        e.preventDefault();
        var lookingFor = $('#mainInput input:first-child').val();
        this.getResults(lookingFor);
    },
    getEntryInput: function(e){
        e.preventDefault();
        var lookingFor = $('#searchFood input:first-child').val();
        this.getResults(lookingFor);
        
        
    },
    getResults: function(lookingFor){
        //empty collection
        holdSearchResults.reset();
        var results = new GetFoodObjects([], {id: lookingFor}); 
        results.fetch({
            success: function(results){
                
                _.each(results.toJSON(), function(item){
                    holdSearchResults.add(
                        new FoodAttributes({
                            item_name: item.fields.item_name,
                            brand_name: item.fields.brand_name,
                            nf_serving_size_qty: item.fields.nf_serving_size_qty,
                            nf_calories: item.fields.nf_calories
                        })
                    );
                    
                });
            // By convention, in order to avoid spaghetti code, bacbone views shouldn't directly talk to each other. In this case, the view does talk directly to showSearchResults in order to avoid multiple rendering through an on('add') method that would otherwise have to be declared in ShowSearchResults to keep track of the holdSearchResults collection.
            showSearchResults.render();
            }
        });
    }
});
var ShowSearchResults = Backbone.View.extend({
    el: '#searchDiv',
    events: {
      'click button.btn-success': 'addToLog',
      'submit #mainInput': 'getInput'
    },
    initialize: function(){
        _.bindAll(this, 'render');
        this.resultsDiv = $('#resultsContainer');
        
        this.collection = holdSearchResults;
    },
    render: function(){
        var element = this.resultsDiv;
        var results = this.collection.toJSON();
        var template = _.template($('#searchResultsTemplate').html());
        
        //clear if needed
        element.empty();
        _.each(results, function(item){
            var itemHTML = template(item);
            element.append(itemHTML);
        });
    },
    addToLog: function(e){
        // get 'grandparent' of button
        var foodDiv = e.currentTarget.parentNode.parentNode
        // get food attributes 
        var item_name = foodDiv.getElementsByClassName("ItemName")[0].textContent; 
        var item_brand = foodDiv.getElementsByClassName("ItemBrand")[0].textContent;
        var item_calories = foodDiv.getElementsByClassName("ItemCalories")[0].textContent;
        var item_srv_size = foodDiv.getElementsByClassName("ItemSrvSize")[0].textContent;
        
        //add to collection
        holdFoodEntries.add(
            new FoodAttributes({
                item_name: item_name,
                brand_name: item_brand,
                nf_serving_size_qty: item_srv_size,
                nf_calories: item_calories
            })
        );
        
    },
    getInput: function(e){
        getFoodSearchResult.getSearchInput(e);
    }
});

var ShowFoodEntries = Backbone.View.extend({
    el: '#foodLogDynamic',
    events: {
        'click button.btn-danger': 'deleteEntry',
    },
    initialize: function(){
        // get dynamic conatiner 
        this.counter = $('#calorieCounter h3');
        _.bindAll(this, 'render');
        
        this.collection = holdFoodEntries;
        this.listenTo(this.collection,'add', this.render);
    },
    render: function(){
        var self = this;
        //empty element  
        $(this.el).empty();
        //get all items from collection
        var atributeObject = this.collection.toJSON();
        //get template
        var template = _.template($('#entriesTemplate').html());
        
        _.each(atributeObject, function(item){
            var itemHTML = template(item);
            $(self.el).append(itemHTML);
        });
        
        //update counter
        this.updateCounter();
        
    },
    deleteEntry:  function(e){
        // get 'grandparent' of button 
        var foodDiv = e.currentTarget.parentNode.parentNode;
        // get name of food item to delete 
        var item_name = foodDiv.getElementsByClassName("ItemName")[0].textContent; 
        //find food item in collection using findWhere to only bring ONE match. Using the where method would bring mutliple results if any.
        var foodObject = holdFoodEntries.findWhere({item_name: item_name});
        
        //remove from collection 
        holdFoodEntries.remove(foodObject);
        
        //update food log
        this.render();
        //update counter 
        this.updateCounter();
    },
    updateCounter: function(){
        //get string of calories 
        var caloriesInString = this.collection.pluck('nf_calories');
        //store numbers
        var caloriesInNum = [];
        //store total amount of calories in number form
        var totalCalories = 0;
        
        
        //make string into number and store in caloriesInNum
        _.each(caloriesInString, function(item){
            var number = item.slice(10);
            caloriesInNum.push(parseInt(number, 10));
        });
        
        
        //add all values in caloriesInNum and store sum in totalCalories
        _.each(caloriesInNum, function(item){
            totalCalories = totalCalories + item;
        });
        
        //append total to DOM
        this.counter.text("Total Calories: " + totalCalories);
    }
    
});

var Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        
    }
});


//instances of collections
var holdFoodEntries = new HoldFoodEntries();
var holdSearchResults = new HoldSearchResults();


//instances of views 
var buttonDisplay = new ButtonDisplay();
var newEntryControl = new NewEntryControl();
var getFoodSearchResult = new GetFoodSearchResult();
var showSearchResults = new ShowSearchResults();
var showFoodEntries = new ShowFoodEntries();


//instance of router
var router = new Router();
router.on('route:home', function(){
    // foodLogView.render();
});

Backbone.history.start();









