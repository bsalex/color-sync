module ColorSync exposing (..)

import Html exposing (Html, div)
import Html.Attributes exposing (class, style)
import Task
import ColorDisplay


type alias Model =
    String


initialModel : Model
initialModel =
    "#FFF"


type Msg
    = ChangeColor String
    | ChangedColor String
    | Reset


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        ChangeColor newColor ->
            ( newColor, Task.perform (\_ -> Debug.crash "This failure cannot happen.") identity (Task.succeed (ChangedColor newColor)) )

        Reset ->
            ( initialModel, Cmd.none )

        ChangedColor newColor ->
            ( model, Cmd.none )


view : Model -> Html Msg
view model =
    div [ class "color-sync" ]
        [ div [ class "color-selector" ] []
        , ColorDisplay.view model
        ]
