const { expect } = require('chai');
const setup = require('@iobroker/testing');

// Test the adapter startup
describe('SwitchBot Adapter', function() {
    let harness;

    beforeEach(async function() {
        harness = setup.createHarness();
        await harness.changeAdapterConfig('switchbot.0', {
            enabled: false, // Don't auto-start for testing
            token: 'test-token',
            secret: 'test-secret',
            pollInterval: 60000
        });
    });

    afterEach(async function() {
        if (harness) {
            await harness.stop();
            harness = null;
        }
    });

    it('Should start the adapter without errors', async function() {
        this.timeout(10000);
        
        // Start the adapter
        await harness.startAdapterAndWait();
        
        // Check that adapter is running
        const state = harness.states.getState('switchbot.0.info.connection');
        expect(state).to.exist;
        expect(state.val).to.be.a('boolean');
    });

    it('Should create info objects', async function() {
        this.timeout(10000);
        
        await harness.startAdapterAndWait();
        
        // Check that info channel exists
        const infoChannel = harness.objects.getObject('switchbot.0.info');
        expect(infoChannel).to.exist;
        expect(infoChannel.type).to.equal('channel');
        
        // Check that connection state exists
        const connectionState = harness.objects.getObject('switchbot.0.info.connection');
        expect(connectionState).to.exist;
        expect(connectionState.type).to.equal('state');
        expect(connectionState.common.role).to.equal('indicator.connected');
    });
});