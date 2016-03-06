//holds the traditional object format of all food items being returned and being stored in collections.
var FoodAttributes = Backbone.Model.extend({
    defaults: {
        item_name: "",
        brand_name: "",
        nf_serving_size_qty: null,
        nf_calories: null
    }
});
//collection below holds the url which we use to fetch data from the nutritionix api 
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
//collection below holds active food entries that will be displayed in the DOM
var HoldFoodEntries = Backbone.Collection.extend({
    model: FoodAttributes,
    initialize: function(){
        
    }
});
//collection below holds search results that will be displayed in the DOM
var HoldSearchResults = Backbone.Collection.extend({
    model: FoodAttributes
});
//view below activates css for when user clicks on 'new entry' button
var ButtonDisplay = Backbone.View.extend({
    
    el: '.row1',
    events: {
        'click button#newEntryButton': 'renderSearchBox',
    },
    renderSearchBox: function(){
        $('#newEntryCSS').removeClass('hidden');
    }
});
//view below handles user submit events and requests fetch method to get food results from nutritionix api. Lastly stores the data in holdSearchResults
var GetFoodSearchResult = Backbone.View.extend({
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
            beforeSend: function(){
                //display loading indicator 
                showSearchResults.renderLoadingGIF();
            },
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
            },
            error: function(){
                showSearchResults.renderError();
            }
        });
    }
});
//view below listens to user submit event and launches GetFoodSearchResult.getEntryInput
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
//view below is bind to holdSearchResults and rerenders itself when collection is modified 
var ShowSearchResults = Backbone.View.extend({
    el: '#resultsContainer',
    events: {
      'click button.add': 'addToLog'
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
    renderError: function(){
        var element = this.resultsDiv;
        //removes previous results and loading gif
        element.empty();
        
        element.append('<h4>Sorry! No item found</h4>');
    },
    renderLoadingGIF: function(){
        //get loading div that's inside main el
        var element = $('#loadingIcon');
        element.removeClass('hidden');
    },
    addToLog: function(e){
        var element = this.resultsDiv;
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
        
        //clear search results 
        element.empty();
    }
});
//view below is bind to holdFoodEntries and rerenders itself when collection is modified. Also rerenders total calories 
var ShowFoodEntries = Backbone.View.extend({
    el: '#foodLogDynamic',
    events: {
        'click button.delete': 'deleteEntry',
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

//router handler 
var Router = Backbone.Router.extend({
    routes: {
        '': 'home'
        
    }
});


                            // BELOW ARE THE INSTANCES 



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



//start backbone
Backbone.history.start();









