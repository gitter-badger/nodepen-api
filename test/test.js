var Nodepen = require('../lib/nodepen.js');

var chai = require('chai'),
		expect = chai.expect,
	  should = chai.should();

var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var np = new Nodepen();

describe('Nodepen', function(){


	describe('Properties', function(){
		it('should have username and domain props defined', function(){
			np.should.have.property('username');
			np.should.have.property('domain');
		})
	});

	describe('Check login', function(){
		this.timeout(5000);
		it('should be not logged in and return false', function(done){
			var promise = np.checkLogin();
			promise.should.be.eventually.false.and.notify(done);
		});
	});

	describe('Check user data response', function(){
		this.timeout(5000);
		it('should return an object with valid user data', function(done){
			var promise = np.getUserData('mallendeo');
			promise.should.be.fullfilled;
			promise.should.eventually.have.property('name', 'Mauricio Allende').and.notify(done);


		});
	});


});
