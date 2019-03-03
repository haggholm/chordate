import { autobind } from 'core-decorators';
import _ from 'lodash';
import { PureComponent } from 'react';
import React from 'react';
import {
	Button,
	Card,
	Col,
	FormControl,
	FormGroup,
	ListGroup,
	ListGroupItem,
	Modal,
	ProgressBar,
	Row,
} from 'react-bootstrap';
import { SoundItem, SoundType, TestType } from '../lib/interfaces';

interface TestSessionProps {
	type: SoundType;
	mode: TestType;
	items: Array<SoundItem>;
}

interface TestSessionState {
	answered: number;
	right: number;
	wrong: number;
	currentItem?: SoundItem;
	currentAnswer: '';
	lastAnswerCorrect: boolean;
	isPlaying: boolean;
	audioBlob?: Blob;
	audioURL?: string;
	audio?: HTMLAudioElement;
	showModal: boolean;
}

export default class TestSession extends PureComponent<
	TestSessionProps,
	TestSessionState
> {
	private closeModalTimeout: NodeJS.Timeout;

	constructor(props) {
		super(props);
		this.state = {
			answered: 0,
			right: 0,
			wrong: 0,
			currentItem: _.sample(props.items),
			lastAnswerCorrect: true,
			currentAnswer: '',
			isPlaying: false,
			audioBlob: null,
			audioURL: null,
			audio: null,
			showModal: false,
		};

		this.loadCurrentItem(props);
	}

	@autobind
	public async loadCurrentItem(props = null) {
		if (!props) {
			props = this.props;
		}
		if (this.state.audioURL) {
			URL.revokeObjectURL(this.state.audioURL);
			this.setState({
				audioBlob: null,
				audioURL: null,
				audio: null,
			});
		}

		if (!this.state.currentItem) {
			throw new Error('No current item available');
		}

		const response = await fetch(
			`/api/${props.type}/${this.state.currentItem.id}`
		);
		const json = await response.json();
		const buf = Buffer.from(json.data, 'hex');
		const audioBlob = new Blob([buf], { type: 'audio/webm' });
		const audioURL = URL.createObjectURL(audioBlob);

		this.setState({
			audioBlob,
			audioURL,
			audio: new Audio(audioURL),
		});
		await this.play();
	}

	@autobind
	public async play() {
		if (!this.state.audio) {
			throw new Error('No audio to play');
		}

		this.setState({ isPlaying: true });
		const fn = () => this.setState({ isPlaying: false });
		await this.state.audio.play();
		this.state.audio.addEventListener('ended', () => {
			this.state.audio.removeEventListener('ended', fn);
			this.setState({ isPlaying: false });
		});
	}

	public render() {
		return (
			<React.Fragment>
				{this.renderModal()}
				<Row>
					<Col md={12}>
						<ProgressBar>
							<ProgressBar
								striped={true}
								max={this.state.answered}
								label={<strong>{this.state.right}</strong>}
								variant="success"
								now={this.state.right}
							/>
							<ProgressBar
								striped={true}
								max={this.state.answered}
								label={this.state.wrong}
								variant="danger"
								now={this.state.wrong}
							/>
							<ProgressBar
								striped={true}
								max={this.state.answered}
								label={<strong>{this.state.wrong}</strong>}
								variant="danger"
								now={this.state.wrong}
							/>
						</ProgressBar>
					</Col>
				</Row>
				<Row>
					<Col md={12}>
						{' '}
						<Button
							variant="primary"
							onClick={this.play}
							disabled={this.state.isPlaying || !this.state.audio}
							style={{ marginBottom: '1ex' }}
							id="test-session-play-button"
						>
							<i className="fa fa-play" />
							Play
						</Button>
					</Col>
				</Row>
				<Row>{this.renderAnswerSection()}</Row>
			</React.Fragment>
		);
	}

	@autobind
	public renderAnswerSection() {
		if (this.props.mode === 'multiple-choice') {
			return (
				<ListGroup>
					{this.props.items.map(({ id, name }) => (
						<ListGroupItem
							key={`${this.state.answered}:${id}`}
							onClick={() => this.guess({ id })}
						>
							{name}
						</ListGroupItem>
					))}
				</ListGroup>
			);
		} else {
			return (
				<form
					onSubmit={(evt) => {
						evt.preventDefault();
						this.guess({ answer: this.state.currentAnswer });
					}}
				>
					<FormGroup>
						<FormControl
							type="text"
							autoFocus={true}
							value={this.state.currentAnswer}
							onChange={this.typeAnswer}
						/>
					</FormGroup>
				</form>
			);
		}
	}

	public componentWillUnmount() {
		if (this.closeModalTimeout) {
			clearTimeout(this.closeModalTimeout);
		}
	}

	@autobind
	public typeAnswer(evt) {
		this.setState({ currentAnswer: evt.target.value });
	}

	@autobind
	public guess(answer: { id: number } | { answer: string }) {
		const currentItem = this.state.currentItem;
		if (!currentItem) {
			throw new Error('No current item');
		}

		let correct;
		if (answer.hasOwnProperty('id')) {
			const a = answer as { id: number };
			correct = a.id === currentItem.id;
			this.setState({
				currentAnswer: _.find(this.props.items, ({ id }) => id === a.id).name,
			});
		} else {
			const a = answer as { answer: string };
			const fmt = (str) => str.trim().replace(/\s+/g, ' ');
			correct = fmt(a.answer) === fmt(currentItem.name);
		}

		this.setState({
			showModal: true,
			lastAnswerCorrect: correct,
		});
		this.closeModalTimeout = setTimeout(this.closeModal, 3000);
	}

	@autobind
	public async closeModal() {
		if (this.closeModalTimeout) {
			clearTimeout(this.closeModalTimeout);
			this.closeModalTimeout = null;
		}

		this.setState({
			showModal: false,
			currentItem: _.sample(this.props.items),
			currentAnswer: '',
			answered: this.state.answered + 1,
		});
		if (this.state.lastAnswerCorrect) {
			this.setState({ right: this.state.right + 1 });
		} else {
			this.setState({ wrong: this.state.wrong + 1 });
		}
		await this.loadCurrentItem();
	}

	public componentDidUpdate(prevProps, prevState) {
		if (this.state.answered !== prevState.answered) {
			document.getElementById('test-session-play-button').focus();
		}
	}

	@autobind
	public renderModal() {
		const content = this.state.lastAnswerCorrect ? (
			<Card.Body>
				<Card.Title>Correct!</Card.Title>
				{this.state.currentAnswer} was the right answer.
			</Card.Body>
		) : (
			<Card.Body>
				<Card.Title>Wrong!</Card.Title>
				{this.state.currentAnswer} was the wrong answer.
				<br />
				The correct answer was <strong>{this.state.currentItem.name}</strong>.
			</Card.Body>
		);

		const cardType = this.state.lastAnswerCorrect ? 'success' : 'danger';
		return (
			<Modal
				show={this.state.showModal}
				onHide={this.closeModal}
				restoreFocus={false}
				size="sm"
			>
				<Modal.Body>
					<Card bg={cardType} border={cardType} text={cardType}>
						<Card.Body>{content}</Card.Body>
					</Card>
					{this.state.lastAnswerCorrect}
				</Modal.Body>
			</Modal>
		);
	}
}
